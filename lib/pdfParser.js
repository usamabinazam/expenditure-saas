// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary
//
// Logic:
// 1. Track 3 sections: Pays → Allowances → Deductions
// 2. Pays + Allowances: collect A-code amounts (SUM same codes)
// 3. Deductions: if an A-code appears (e.g. A01151 Recovery of Pay)
//    → subtract that amount from the Pays/Allowances total
// 4. Last column in each row = "Amount (Total Employees)" = 7th column
// 5. Skip G/C/E codes entirely (only A-codes are budget heads)
// ============================================================

export async function parsePayrollPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Collect all text items from all pages with position info
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

// Group text items into lines by Y position
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

// Main parse
function parse(lines) {
  // pays_allowances: amounts from Pays + Allowances sections
  const paysAllowances = {};
  // deductionsA: A-code amounts found inside Deductions section (recoveries)
  const deductionsA = {};

  // Budget code: A + exactly 5 alphanumeric = 6 chars total
  // e.g. A01101, A01151, A0120D, A0121T, A0122C, A0124N, A0125Q
  const BUDGET_CODE = /^(A[0-9A-Z]{5})\b/;

  // Amount pattern: number.decimals (count)
  // e.g. "377,650.00 (5 )"  "51,245,434.00 (1,377 )"
  const AMOUNT = /(\d[\d,]*\.\d+)\s*\(\s*[\d,]+\s*\)/g;

  // Lines to skip
  const SKIP = /^(Total|G\/L|Account|System|Net |\*All|DDO)/i;

  let section = null; // 'pays' | 'allowances' | 'deductions'

  for (const line of lines) {
    if (!line.trim()) continue;

    // ── Section detection ──────────────────────────────────
    if (/^Pays$/i.test(line))         { section = 'pays';        continue; }
    if (/^Allowances$/i.test(line))   { section = 'allowances';  continue; }
    if (/^Deductions?\b/i.test(line)) { section = 'deductions';  continue; }

    // Skip header/total/footer lines
    if (SKIP.test(line)) continue;

    // ── Code detection ─────────────────────────────────────
    const codeMatch = line.match(BUDGET_CODE);
    if (!codeMatch) continue;
    const code = codeMatch[1]; // e.g. "A01151"

    // ── Amount extraction ──────────────────────────────────
    AMOUNT.lastIndex = 0;
    const allAmounts = [];
    let m;
    while ((m = AMOUNT.exec(line)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      allAmounts.push(val);
    }
    if (allAmounts.length === 0) continue;

    // Last amount = "Amount (Total Employees)" — always the 7th column
    const target = allAmounts[allAmounts.length - 1];
    if (!target || target <= 0) continue;

    // ── Store by section ───────────────────────────────────
    if (section === 'pays' || section === 'allowances') {
      paysAllowances[code] = (paysAllowances[code] || 0) + target;

    } else if (section === 'deductions') {
      // Only A-codes in Deductions are budget recoveries to subtract
      // G/C/E codes are ignored (they're non-budget deductions)
      if (code.startsWith('A')) {
        deductionsA[code] = (deductionsA[code] || 0) + target;
        console.log(`Recovery deduction: ${code} = ${target.toLocaleString()}`);
      }
    }
  }

  // ── Final amounts: subtract recoveries ────────────────────
  // If a code appears in both Pays/Allowances AND Deductions,
  // the deduction is a "Recovery" → subtract it from the budget amount
  const amounts = { ...paysAllowances };
  for (const [code, deductAmt] of Object.entries(deductionsA)) {
    if (code in amounts) {
      amounts[code] = amounts[code] - deductAmt;
      console.log(`${code}: ${paysAllowances[code].toLocaleString()} - ${deductAmt.toLocaleString()} (recovery) = ${amounts[code].toLocaleString()}`);
    }
  }

  // Remove any that ended up zero or negative after subtraction
  for (const code of Object.keys(amounts)) {
    if (amounts[code] <= 0) delete amounts[code];
  }

  const grandTotal = Object.values(amounts).reduce((s, v) => s + v, 0);

  return {
    amounts,      // { 'A01101': 377650, 'A01151': 52561024, ... }
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
