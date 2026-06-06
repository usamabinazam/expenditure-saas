// ============================================================
// PDF PARSER v4 - AGP/Treasury Payroll Summary
//
// Simple approach:
// 1. Find line with budget code (starts with A)
// 2. Extract ALL "number.xx (count)" patterns
// 3. Take 3rd amount = Total Employees of budget row
//    (whether merged or not, 3rd is always budget total)
// 4. Stop parsing at "Deductions" section
// 5. SUM same codes
// ============================================================

export async function parsePayrollPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Collect ALL text items from all pages
  let allItems = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const tc = await page.getTextContent();
    allItems = allItems.concat(tc.items);
  }

  const lines = toLines(allItems);
  console.log('=== PDF Lines ===');
  lines.forEach((l, i) => console.log(i, l));

  const result = parse(lines);
  console.log('=== Parsed Amounts ===', result.amounts);
  return result;
}

// ── Convert PDF text items to lines by Y position ──────────
function toLines(items) {
  const groups = {};
  items.forEach(item => {
    if (!item.str || !item.str.trim()) return;
    const y = Math.round(item.transform[5]);
    const x = item.transform[4];
    if (!groups[y]) groups[y] = [];
    groups[y].push({ t: item.str, x });
  });

  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => b - a) // top to bottom
    .map(y => groups[y].sort((a, b) => a.x - b.x).map(f => f.t).join(' ').trim())
    .filter(l => l.length > 0);
}

// ── Main parser ─────────────────────────────────────────────
function parse(lines) {
  const amounts = {};   // { code: totalAmount }
  const occurrences = {};

  // Budget code: A + 3 digits + 1 alphanumeric
  // e.g. A01101, A01151, A0120D, A0121T, A0122C
  const BCODE = /\b(A[0-9]{3}[A-Z0-9])\b/;

  // Amount pattern: digits.digits (count)
  // e.g. "377,650.00 (5 )"  "51,245,434.00 (1,377 )"  "0.00 (0 )"
  const AMT = /(?:^|[\s])(\d[\d,]*\.\d+)\s*\(\s*[\d,]+\s*\)/g;

  let stopParsing = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    // ── Stop at Deductions section ─────────────────────────
    // When we see "Total Deductions" or line containing "Deductions" without A-code
    if (/\bDeductions?\b/i.test(line) && !BCODE.test(line)) {
      stopParsing = true;
      continue;
    }
    if (/Total Deductions/i.test(line)) {
      stopParsing = true;
      continue;
    }
    if (stopParsing) continue;

    // ── Skip non-data lines ────────────────────────────────
    if (/^(G\/L|Account|Description|Wage|Total\s+(Pays|Allowances|Gross)|System\s+gen|\*All\s+amounts|Net\s+Payment|Total\s+Employees)/i.test(line)) continue;

    // ── Find budget code ───────────────────────────────────
    const codeMatch = line.match(BCODE);
    if (!codeMatch) continue;
    const code = codeMatch[1];

    // ── Extract all amounts ────────────────────────────────
    AMT.lastIndex = 0;
    const allAmounts = [];
    let m;
    while ((m = AMT.exec(line)) !== null) {
      // m[1] = full decimal number e.g. '377,650.00' - extract integer part
      const intPart = m[1].split('.')[0].replace(/,/g, '');
      const val = parseFloat(intPart);
      allAmounts.push(val);
    }

    if (allAmounts.length === 0) continue;

    // ── Pick the right amount ──────────────────────────────
    //
    // PDF layout (2 columns merged):
    //
    // Case 1: Clean row (3 amounts):
    //   [Gazetted, Non-Gazetted, TOTAL] ← take last = TOTAL
    //
    // Case 2: Merged row (6 amounts):
    //   [Gaz, NonGaz, TOTAL, Gaz2, NonGaz2, TOTAL2]
    //   Budget row total = 3rd (index 2) ✅
    //
    // Case 3: Any other count:
    //   Take 3rd if available, else last
    //
    let target;

    if (allAmounts.length <= 3) {
      // Clean: take last
      target = allAmounts[allAmounts.length - 1];
    } else {
      // Merged: take 3rd (index 2) = budget row total
      target = allAmounts[2];
    }

    // Skip zero amounts
    if (!target || target <= 0) continue;

    // ── SUM same codes ─────────────────────────────────────
    amounts[code] = (amounts[code] || 0) + target;

    if (!occurrences[code]) occurrences[code] = [];
    occurrences[code].push(target);

    console.log(`${code}: +${target.toLocaleString()} [${allAmounts.length} amts] → ${amounts[code].toLocaleString()}`);
  }

  return {
    amounts,
    summary: {
      totalCodes: Object.keys(amounts).length,
      grandTotal: Object.values(amounts).reduce((s, v) => s + v, 0),
      occurrences,
    },
  };
}

// ── Match PDF amounts to user budget heads ──────────────────
export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  const headMap = {};
  budgetHeads.forEach(h => {
    headMap[h.code.toUpperCase().trim()] = h;
  });

  const matched = {};
  const matchedHeads = [];
  const missingCodes = [];

  for (const [code, amount] of Object.entries(pdfAmounts)) {
    const head = headMap[code];
    if (head) {
      matched[code] = amount;
      matchedHeads.push({ code, name: head.name, section: head.section, amount, headId: head.id });
    } else {
      missingCodes.push({ code, amount });
    }
  }

  const order = { pays: 0, allowances: 1, non_salary: 2 };
  matchedHeads.sort((a, b) => (order[a.section] ?? 9) - (order[b.section] ?? 9));
  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  return { matched, matchedHeads, missingCodes };
}
