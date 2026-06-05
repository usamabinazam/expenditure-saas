// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary
// 
// PDF Structure:
// G/L Account | Description | Wage Type | Description | 
//   Amount(Gazetted) | Amount(Non-Gazetted) | Amount(Total)
//
// We need:
//   - Column 1: G/L Account code (A01101, A01151, A0120D etc.)
//   - Column 7: Amount (Total Employees) → last "xxxxxx.xx (n)" in line
//
// Rules:
//   1. Same code appears multiple times → SUM all amounts
//   2. Extract integer part only (before .xx)
//   3. Skip "Deductions" section
//   4. Skip lines where amount = 0
// ============================================================

/**
 * Load PDF.js dynamically and parse the file
 */
export async function parsePayrollPDF(file) {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker (CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  // Convert file to ArrayBuffer
  const buffer = await file.arrayBuffer();

  // Load PDF document
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Extract text from ALL pages
  let allLines = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageLines = extractLinesFromPage(textContent.items);
    allLines = allLines.concat(pageLines);
  }

  // Now parse lines into { code: amount } map
  const result = parseLines(allLines);
  return result;
}

// ============================================================
// STEP 1: Convert PDF text items into readable lines
// PDF gives text as scattered fragments with x,y coordinates
// Group by Y position to rebuild lines
// ============================================================
function extractLinesFromPage(items) {
  if (!items || items.length === 0) return [];

  // Group text fragments by Y position (same Y = same line)
  const yGroups = {};
  items.forEach(item => {
    if (!item.str || item.str.trim() === '') return;
    
    // Round Y to nearest 2 units (handles slight float differences)
    const y = Math.round(item.transform[5] / 2) * 2;
    const x = item.transform[4];
    
    if (!yGroups[y]) yGroups[y] = [];
    yGroups[y].push({ text: item.str, x });
  });

  // Sort Y descending (top of page first), then X ascending (left to right)
  const sortedYs = Object.keys(yGroups)
    .map(Number)
    .sort((a, b) => b - a); // Descending (top to bottom)

  const lines = sortedYs.map(y => {
    const fragments = yGroups[y].sort((a, b) => a.x - b.x);
    return fragments.map(f => f.text).join(' ').trim();
  });

  return lines.filter(l => l.length > 0);
}

// ============================================================
// STEP 2: Parse lines into { code: totalAmount } map
// 
// Line format:
// "A01101 Basic Pay 0001 Basic Pay 377,650.00 (5 ) 0.00 (0 ) 377,650.00 (5 )"
//    ↑                                              ↑           ↑
//   CODE                                      Gazetted    Non-Gazetted  Total(last)
//
// We want: CODE + LAST amount value
// ============================================================
function parseLines(lines) {
  // { code: summedAmount }
  const amounts = {};
  
  // Track for debugging: { code: [amount1, amount2...] }
  const occurrences = {};
  
  // Section tracking
  // Only parse Pays + Allowances, skip Deductions
  let inPayroll = false;  // true when we're in Pays or Allowances
  let inDeductions = false; // true when in Deductions

  // Budget code regex: starts with A, followed by 4 chars (digits or uppercase letters)
  // Examples: A01101, A01151, A01202, A0120D, A0120E, A0121T, A0122C, A0124N, A0124X
  const CODE_REGEX = /^(A[0-9]{3}[A-Z0-9])\s/;

  // Amount with count regex: "377,650.00 (5 )" or "51,245,434.00 (1,377 )" or "0.00 (0)"
  // Captures the numeric amount before ".xx (count)"
  // Format: digits with optional commas, then decimal point, then digits, then space, then parenthesized count
  const AMOUNT_WITH_COUNT = /(\d[\d,]*)\.\d+\s*\(\s*[\d,]+\s*\)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ── Section Detection ────────────────────────────────
    // Detect "Pays" section start (standalone word, not part of code line)
    if (/^Pays\s*$/i.test(trimmed)) {
      inPayroll = true;
      inDeductions = false;
      continue;
    }
    
    // Detect "Allowances" section start
    if (/^Allowances\s*$/i.test(trimmed)) {
      inPayroll = true;
      inDeductions = false;
      continue;
    }
    
    // Detect "Deductions" section start - STOP parsing
    if (/^Deductions\s*$/i.test(trimmed)) {
      inPayroll = false;
      inDeductions = true;
      continue;
    }

    // Skip total lines (Total Pays, Total Allowances, etc.)
    if (/^Total\s/i.test(trimmed)) continue;
    
    // Skip header lines
    if (/^G\/L\s+Account/i.test(trimmed)) continue;
    if (/^Description\s+Wage/i.test(trimmed)) continue;
    if (/^\(Gazetted/i.test(trimmed)) continue;
    if (/^\(Non\s+Gazetted/i.test(trimmed)) continue;
    if (/^System generated/i.test(trimmed)) continue;
    if (/^\*All amounts/i.test(trimmed)) continue;

    // Skip if in deductions
    if (inDeductions) continue;
    
    // Skip if not in payroll section yet
    if (!inPayroll) continue;

    // ── Code Detection ────────────────────────────────────
    const codeMatch = trimmed.match(CODE_REGEX);
    if (!codeMatch) continue;

    const code = codeMatch[1].toUpperCase();

    // ── Amount Extraction ─────────────────────────────────
    // Find ALL amount patterns in this line
    const matches = [...trimmed.matchAll(AMOUNT_WITH_COUNT)];
    
    if (matches.length === 0) continue;

    // LAST match = Total Employees column
    const lastMatch = matches[matches.length - 1];
    
    // Extract integer part: remove commas, take the part before decimal
    const rawAmount = lastMatch[1].replace(/,/g, '');
    const amount = parseFloat(rawAmount);

    // Skip if zero or invalid
    if (isNaN(amount) || amount <= 0) continue;

    // SUM for same code
    amounts[code] = (amounts[code] || 0) + amount;
    
    if (!occurrences[code]) occurrences[code] = [];
    occurrences[code].push(amount);
  }

  // Summary stats
  const summary = {
    totalCodes: Object.keys(amounts).length,
    grandTotal: Object.values(amounts).reduce((s, v) => s + v, 0),
    occurrences, // For debugging
  };

  return { amounts, summary };
}

// ============================================================
// MATCH PDF AMOUNTS TO USER'S BUDGET HEADS
// 
// Returns:
//   matched    - { code: amount } heads that exist in user's system
//   matchedHeads - [{code, name, section, amount}] for display
//   missingCodes - [{code, amount}] PDF codes not in budget heads
// ============================================================
export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  // Normalize user codes to uppercase for matching
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
      // Code exists in user's budget heads
      matched[code] = amount;
      matchedHeads.push({
        code,
        name: head.name,
        section: head.section,
        amount,
        headId: head.id,
      });
    } else {
      // Code NOT in user's budget heads
      missingCodes.push({ code, amount });
    }
  }

  // Sort matched by section order for display
  const sectionOrder = { pays: 0, allowances: 1, non_salary: 2 };
  matchedHeads.sort((a, b) => 
    (sectionOrder[a.section] ?? 9) - (sectionOrder[b.section] ?? 9)
  );

  // Sort missing by code alphabetically
  missingCodes.sort((a, b) => a.code.localeCompare(b.code));

  return { matched, matchedHeads, missingCodes };
}
