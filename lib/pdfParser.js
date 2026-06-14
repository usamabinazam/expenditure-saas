// v5-redeploy
// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary
//
// Logic:
// 1. Read all pages, group text by Y position into lines
// 2. For EACH line, find ALL A-codes (budget codes) in the line
//    - This handles pdf.js merging G-code rows with A-code rows
//    - e.g. "G12713 ... A01217 ..." -> extracts A01217 correctly
// 3. For each A-code found, take amounts that appear AFTER that code
//    - Last amount in that segment = Total Employees (7th column)
// 4. Track sections: Pays -> Allowances -> Deductions
//    - Deductions: A-codes found here = recoveries to SUBTRACT
// 5. Final = Pays+Allowances totals MINUS any recovery deductions
// ============================================================

export async function parsePayrollPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Collect all text items from all pages
  let allItems = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const tc = await page.getTextContent();
    allItems = allItems.concat(
      tc.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }))
    );
  }

  const lines = buildLines(allItems);
  const result = parse(lines);

  console.log('=== PDF Parser Result ===', result.amounts);
  return result;
}

// Group text items into lines by Y position (same Y = same row)
function buildLines(items) {
  const groups = {};
  items.forEach(({ str, x, y }) => {
    if (!str || !str.trim()) return;
    const row = Math.round(y);
    if (!groups[row]) groups[row] = [];
    groups[row].push({ str, x });
  });

  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => b - a)           // descending Y = top to bottom
    .map(y =>
      groups[y]
        .sort((a, b) => a.x - b.x)  // left to right
        .map(f => f.str)
        .join(' ')
        .trim()
    )
    .filter(l => l.length > 0);
}

// Extract (code, amounts[]) segments from a single line
// Handles merged lines like "G12713 ... 23,792.00 (3) A01217 ... 7,837.00 (4)"
function extractSegments(line) {
  // Budget code: A + exactly 5 alphanumeric = 6 chars total
  // e.g. A01101, A01151, A0120D, A0121T, A0125Q
  const BUDGET_CODE = /\b(A[0-9A-Z]{5})\b/g;

  // Amount: number.decimals (count)
  // e.g. "377,650.00 (5 )"  "51,245,434.00 (1,377 )"
  const AMOUNT = /(\d[\d,]*\.\d+)\s*\(\s*[\d,]+\s*\)/g;

  const segments = [];
  const codeMatches = [...line.matchAll(BUDGET_CODE)];

  for (let i = 0; i < codeMatches.length; i++) {
    const code = codeMatches[i][1];
    const segStart = codeMatches[i].index;
    const segEnd = i + 1 < codeMatches.length ? codeMatches[i + 1].index : line.length;
    const segText = line.slice(segStart, segEnd);

    // Extract amounts from this segment only
    AMOUNT.lastIndex = 0;
    const amts = [];
    let m;
    while ((m = AMOUNT.exec(segText)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      amts.push(val);
    }

    if (amts.length > 0) {
      segments.push({ code, amts });
    }
  }

  return segments;
}

// Main parse function
function parse(lines) {
  const paysAllowances = {};   // amounts from Pays + Allowances sections
  const deductionsA = {};      // A-code amounts found in Deductions section

  const SKIP = /^(Total|G\/L|Account|System|Net |\*All|DDO)/i;

  let section = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // ── Section detection ──────────────────────────────────
    if (/^Pays$/i.test(line))          { section = 'pays';        continue; }
    if (/^Allowances$/i.test(line))    { section = 'allowances';  continue; }
    if (/^Deductions?\b/i.test(line))  { section = 'deductions';  continue; }

    // Skip header/total/footer lines
    if (SKIP.test(line)) continue;

    // ── Extract all A-code segments from line ──────────────
    // This handles normal lines AND merged G+A lines
    const segments = extractSegments(line);
    if (segments.length === 0) continue;

    for (const { code, amts } of segments) {
      // Last amount in segment = Total Employees (7th column)
      const target = amts[amts.length - 1];
      if (!target || target <= 0) continue;

      if (section === 'pays' || section === 'allowances') {
        paysAllowances[code] = (paysAllowances[code] || 0) + target;

      } else if (section === 'deductions') {
        // A-codes in Deductions = salary recoveries → subtract from budget totals
        deductionsA[code] = (deductionsA[code] || 0) + target;
        console.log(`Recovery deduction: ${code} = ${target.toLocaleString()}`);
      }
    }
  }

  // ── Subtract recoveries from budget amounts ────────────────
  const amounts = { ...paysAllowances };
  for (const [code, deductAmt] of Object.entries(deductionsA)) {
    if (code in amounts) {
      const before = amounts[code];
      amounts[code] = amounts[code] - deductAmt;
      console.log(`${code}: ${before.toLocaleString()} - ${deductAmt.toLocaleString()} (recovery) = ${amounts[code].toLocaleString()}`);
    }
  }

  // Remove zero/negative entries
  for (const code of Object.keys(amounts)) {
    if (amounts[code] <= 0) delete amounts[code];
  }

  const grandTotal = Object.values(amounts).reduce((s, v) => s + v, 0);

  return {
    amounts,
    summary: {
      totalCodes: Object.keys(amounts).length,
      grandTotal,
      recoveries: Object.entries(deductionsA).map(([code, amt]) => ({
        code,
        originalAmount: paysAllowances[code] || 0,
        recoveryAmount: amt,
        finalAmount: amounts[code] || 0,
      })),
    },
  };
}

// Match parsed amounts to user's budget heads
export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  const headMap = {};
  budgetHeads.forEach(h => {
    headMap[h.code.toUpperCase().trim()] = h;
  });

  const matchedHeads = [];
  const missingCodes = [];

  for (const [code, amount] of Object.entries(pdfAmounts)) {
    const head = headMap[code.toUpperCase()];
    if (head) {
      matchedHeads.push({
        code,
        name: head.name,
        section: head.section,
        amount,
        headId: head.id,
      });
    } else {
      missingCodes.push({ code, amount });
    }
  }

  const sectionOrder = { pays: 0, allowances: 1, non_salary: 2 };
  matchedHeads.sort(
    (a, b) => (sectionOrder[a.section] ?? 9) - (sectionOrder[b.section] ?? 9)
  );
  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  const totalMatched = matchedHeads.reduce((s, h) => s + h.amount, 0);
  const totalMissing = missingCodes.reduce((s, h) => s + h.amount, 0);

  return { matchedHeads, missingCodes, totalMatched, totalMissing };
}
