// PDF PARSER v6 - AGP/Treasury Payroll Summary
// FIX: Process each page separately (not mixed global Y sort)
// This prevents page 2 "Deductions" header from affecting page 1 bottom rows

export async function parsePayrollPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Process each page separately and concatenate lines in page order
  const allLines = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }));
    const pageLines = buildLines(items);
    allLines.push(...pageLines);
  }

  console.log('=== PDF Lines (first 60) ===');
  allLines.slice(0, 60).forEach((l, i) => console.log(i, l));

  const result = parse(allLines);
  console.log('=== Final Amounts ===', result.amounts);
  return result;
}

// Group text items from ONE PAGE into lines by Y position
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
    .sort((a, b) => b - a)           // descending Y = top to bottom within page
    .map(y =>
      groups[y].sort((a, b) => a.x - b.x).map(f => f.str).join(' ').trim()
    )
    .filter(l => l.length > 0);
}

function getAmounts(text) {
  const AMT = /(\d[\d,]*\.\d+)\s*\(\s*[\d,]+\s*\)/g;
  const results = [];
  let m;
  while ((m = AMT.exec(text)) !== null) {
    results.push(parseFloat(m[1].replace(/,/g, '')));
  }
  return results;
}

function parse(lines) {
  const paysAllowances = {};
  const deductionsA = {};

  const CODE_RE = /\b(A[0-9A-Z]{5})\b/g;
  const SKIP = /^(Total\s|G\/L|Account|System|Net |\*All|DDO)/i;

  let section = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (/^Pays$/i.test(line))         { section = 'pays';        continue; }
    if (/^Allowances$/i.test(line))   { section = 'allowances';  continue; }
    if (/^Deductions?\b/i.test(line)) { section = 'deductions';  continue; }
    if (SKIP.test(line)) continue;

    // Find ALL A-codes in this line (handles merged G+A lines)
    CODE_RE.lastIndex = 0;
    const codeMatches = [];
    let cm;
    while ((cm = CODE_RE.exec(line)) !== null) {
      codeMatches.push({ code: cm[1], idx: cm.index });
    }
    if (codeMatches.length === 0) continue;

    for (let i = 0; i < codeMatches.length; i++) {
      const { code, idx } = codeMatches[i];
      const segEnd = i + 1 < codeMatches.length ? codeMatches[i + 1].idx : line.length;
      const segment = line.slice(idx, segEnd);
      const amts = getAmounts(segment);
      if (amts.length === 0) continue;

      const target = amts[amts.length - 1];
      if (!target || target <= 0) continue;

      if (section === 'pays' || section === 'allowances') {
        paysAllowances[code] = (paysAllowances[code] || 0) + target;
        console.log(`[${section}] ${code}: +${target.toLocaleString()} = ${paysAllowances[code].toLocaleString()}`);
      } else if (section === 'deductions') {
        deductionsA[code] = (deductionsA[code] || 0) + target;
        console.log(`[deductions] ${code}: ${target.toLocaleString()}`);
      }
    }
  }

  // Subtract recovery deductions
  const amounts = { ...paysAllowances };
  for (const [code, deductAmt] of Object.entries(deductionsA)) {
    if (code in amounts) {
      const before = amounts[code];
      amounts[code] -= deductAmt;
      console.log(`Recovery: ${code} ${before.toLocaleString()} - ${deductAmt.toLocaleString()} = ${amounts[code].toLocaleString()}`);
    }
  }

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

export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  const headMap = {};
  budgetHeads.forEach(h => { headMap[h.code.toUpperCase().trim()] = h; });

  const matchedHeads = [];
  const missingCodes = [];

  for (const [code, amount] of Object.entries(pdfAmounts)) {
    const head = headMap[code.toUpperCase()];
    if (head) {
      matchedHeads.push({ code, name: head.name, section: head.section, amount, headId: head.id });
    } else {
      missingCodes.push({ code, amount });
    }
  }

  const order = { pays: 0, allowances: 1, non_salary: 2 };
  matchedHeads.sort((a, b) => (order[a.section] ?? 9) - (order[b.section] ?? 9));
  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  return {
    matchedHeads,
    missingCodes,
    totalMatched: matchedHeads.reduce((s, h) => s + h.amount, 0),
    totalMissing: missingCodes.reduce((s, h) => s + h.amount, 0),
  };
}
