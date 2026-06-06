// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary (Fixed v2)
//
// Fix: More robust section detection + better line reconstruction
// ============================================================

export async function parsePayrollPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Extract ALL text items from ALL pages
  let allItems = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    allItems = allItems.concat(textContent.items);
  }

  // Reconstruct lines
  const lines = reconstructLines(allItems);

  // DEBUG: Log first 50 lines to console (helps debug)
  console.log('=== PDF Lines (first 50) ===');
  lines.slice(0, 50).forEach((l, i) => console.log(i, JSON.stringify(l)));
  console.log('=== Total lines:', lines.length, '===');

  // Parse lines
  const result = parseLines(lines);

  // DEBUG: Log result
  console.log('=== Parse Result ===', result.amounts);
  console.log('=== Summary ===', result.summary);

  return result;
}

function reconstructLines(items) {
  if (!items || items.length === 0) return [];

  // Group by Y position (round to 1 decimal for stability)
  const yGroups = {};

  items.forEach(item => {
    if (!item.str) return;
    const text = item.str; // Keep ALL text including spaces
    const y = Math.round(item.transform[5]); // Round Y
    const x = item.transform[4];

    if (!yGroups[y]) yGroups[y] = [];
    yGroups[y].push({ text, x });
  });

  // Sort Y descending (top to bottom)
  const sortedYs = Object.keys(yGroups)
    .map(Number)
    .sort((a, b) => b - a);

  const lines = sortedYs.map(y => {
    const frags = yGroups[y].sort((a, b) => a.x - b.x);
    return frags.map(f => f.text).join(' ').replace(/\s+/g, ' ').trim();
  });

  return lines.filter(l => l.trim().length > 0);
}

function parseLines(lines) {
  const amounts = {};
  const occurrences = {};

  // Section state:
  // We parse ALL lines with budget codes (A0xxxx format)
  // But STOP when we hit Deductions section
  let inDeductions = false;

  // Budget code pattern: A followed by exactly 4 alphanumeric chars
  // e.g. A01101, A01151, A01202, A0120D, A0120E, A0121T, A0122C
  const CODE_REGEX = /\b(A[0-9]{3}[A-Z0-9])\b/;

  // Amount pattern: number with optional commas, then .digits, then space, then (count)
  // e.g. "377,650.00 (5 )" or "51,245,434.00 (1,377 )" or "0.00 (0 )"
  const AMOUNT_REGEX = /([\d,]+)\.\d+\s*\(\s*[\d,]+\s*\)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ── Stop at Deductions ────────────────────────────────
    if (/\bDeductions?\b/i.test(trimmed) && !CODE_REGEX.test(trimmed)) {
      inDeductions = true;
      continue;
    }

    if (inDeductions) continue;

    // ── Skip header/total/system lines ───────────────────
    if (/^(Total\s|G\/L|Description|Wage\s|Amount\s*\(|System\s+gen|\*All\s+amounts)/i.test(trimmed)) continue;
    if (/Net\s+Payment|Total\s+Gross|Total\s+Employees/i.test(trimmed)) continue;

    // ── Find budget code ──────────────────────────────────
    const codeMatch = trimmed.match(CODE_REGEX);
    if (!codeMatch) continue;

    const code = codeMatch[1].toUpperCase();

    // ── Extract amounts ───────────────────────────────────
    // Find ALL "number.xx (count)" patterns in this line
    const allAmounts = [...trimmed.matchAll(AMOUNT_REGEX)];
    if (allAmounts.length === 0) continue;

    // LAST one = Total Employees column
    const lastAmount = allAmounts[allAmounts.length - 1];

    // Extract integer: remove commas from "377,650" part
    const integerStr = lastAmount[1].replace(/,/g, '');
    const amount = parseFloat(integerStr);

    if (isNaN(amount) || amount <= 0) continue;

    // SUM same codes
    amounts[code] = (amounts[code] || 0) + amount;

    if (!occurrences[code]) occurrences[code] = [];
    occurrences[code].push(amount);
  }

  const summary = {
    totalCodes: Object.keys(amounts).length,
    grandTotal: Object.values(amounts).reduce((s, v) => s + v, 0),
    occurrences,
  };

  return { amounts, summary };
}

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
  matchedHeads.sort((a, b) =>
    (sectionOrder[a.section] ?? 9) - (sectionOrder[b.section] ?? 9)
  );

  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  return { matched, matchedHeads, missingCodes };
}
