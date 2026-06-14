// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary
//
// Logic:
// 1. Read all pages, group text by Y position into lines
// 2. Find lines starting with budget code (A + 5 alphanumeric = 6 chars)
//    e.g. A01101, A0120D, A0121T, A0125Q
// 3. From each line, take the LAST amount = "Total Employees" (7th column)
// 4. SUM same codes (multiple rows per code are adjusted/split entries)
// 5. STOP when "Deductions" section header is found
//    (also skip G/C/E codes even if they appear in Allowances section)
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
    allItems = allItems.concat(tc.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    })));
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
    .sort((a, b) => b - a)                          // top to bottom (PDF y goes up)
    .map(y =>
      groups[y]
        .sort((a, b) => a.x - b.x)                  // left to right
        .map(f => f.str)
        .join(' ')
        .trim()
    )
    .filter(l => l.length > 0);
}

// Main parse function
function parse(lines) {
  const amounts = {};   // { 'A01101': 377650, ... }

  // Budget code: exactly A + 5 alphanumeric chars (6 total)
  // Examples: A01101, A01151, A0120D, A0121T, A0122C, A0124N, A0125Q
  const BUDGET_CODE = /^(A[0-9A-Z]{5})\b/;

  // Amount pattern: digits (with optional commas) + decimal + (count)
  // Examples: "377,650.00 (5 )"  "51,245,434.00 (1,377 )"  "0.00 (0 )"
  const AMOUNT = /(\d[\d,]*\.\d+)\s*\(\s*[\d,]+\s*\)/g;

  // Skip these line patterns (headers, totals, footers)
  const SKIP = /^(Total|G\/L|Account|System|Net |Deduct|\*All|DDO|Pays$|Allowances$)/i;

  let inDeductions = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Stop processing when Deductions section starts
    if (/^Deductions?\b/i.test(line)) {
      inDeductions = true;
      continue;
    }
    if (inDeductions) continue;

    // Skip header/total/footer lines
    if (SKIP.test(line)) continue;

    // Line must start with a budget code (A...)
    const codeMatch = line.match(BUDGET_CODE);
    if (!codeMatch) continue;

    const code = codeMatch[1];

    // Extract all "amount (count)" patterns from this line
    AMOUNT.lastIndex = 0;
    const allAmounts = [];
    let m;
    while ((m = AMOUNT.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      allAmounts.push(val);
    }

    if (allAmounts.length === 0) continue;

    // Take the LAST amount = "Amount (Total Employees)" = 7th column
    const target = allAmounts[allAmounts.length - 1];

    // Skip zero rows
    if (!target || target <= 0) continue;

    // Accumulate (SUM same codes)
    amounts[code] = (amounts[code] || 0) + target;
  }

  const grandTotal = Object.values(amounts).reduce((s, v) => s + v, 0);

  return {
    amounts,       // { 'A01101': 377650, 'A01151': 52692597, ... }
    summary: {
      totalCodes: Object.keys(amounts).length,
      grandTotal,
    },
  };
}

// Match parsed amounts to the user's budget heads
export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  // Build a lookup map: uppercase code -> head
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

  // Sort matched by section order
  const sectionOrder = { pays: 0, allowances: 1, non_salary: 2 };
  matchedHeads.sort(
    (a, b) => (sectionOrder[a.section] ?? 9) - (sectionOrder[b.section] ?? 9)
  );

  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  const totalMatched = matchedHeads.reduce((s, h) => s + h.amount, 0);
  const totalMissing = missingCodes.reduce((s, h) => s + h.amount, 0);

  return { matchedHeads, missingCodes, totalMatched, totalMissing };
}
