// ============================================================
// PDF PARSER - AGP/Treasury Payroll Summary
// 
// Parses "DDO Wise Payroll Summary" PDFs into amount map
// 
// Logic:
// 1. Extract text from PDF using pdf.js
// 2. Identify sections: Pays, Allowances (skip Deductions)
// 3. Match lines starting with budget code (A01XXX or similar)
// 4. Extract LAST amount from each line (Total Employees column)
// 5. SUM amounts if same code appears multiple times
// 6. Return: { code: amount } map
// ============================================================

// Regex to match budget code at line start
// Matches: A01101, A01151, A01202, A0120D, A0120E, A0121T, A0122C, A0124N, A0125Q, etc.
const CODE_REGEX = /^([A][0-9]{3}[A-Z0-9])\s+/;

// Regex to extract last "amount (count)" pattern from a line
// Matches: "377,650.00 (5 )"  or  "0.00 (0)"  or  "1,447,163.00 (8 )"
// We want the LAST occurrence (Total Employees column)
const AMOUNT_PATTERN = /([\d,]+\.?\d*)\s*\(\s*[\d,]+\s*\)/g;

// Section markers
const SECTION_PAYS = /\bPays\b/i;
const SECTION_ALLOWANCES = /\bAllowances\b/i;
const SECTION_DEDUCTIONS = /\bDeductions\b/i;
const SECTION_TOTAL = /^Total\s+(Pays|Allowances|Deductions|Gross|Net|Employees)/i;

/**
 * Main PDF parser function
 * @param {File} file - PDF file from input
 * @returns {Promise<{amounts: Object, summary: Object}>}
 */
export async function parsePayrollPDF(file) {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  
  // Set worker source (CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Extract text from all pages
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Reconstruct lines by Y position (PDF text comes as fragments)
    const lines = reconstructLines(textContent.items);
    fullText += lines.join('\n') + '\n';
  }

  return parseText(fullText);
}

/**
 * Reconstruct text lines from PDF text fragments
 * PDF text comes as scattered fragments with coordinates
 */
function reconstructLines(items) {
  // Group items by Y position (each line has same Y)
  const lineGroups = {};
  
  items.forEach(item => {
    // transform[5] = Y position
    const y = Math.round(item.transform[5]);
    if (!lineGroups[y]) lineGroups[y] = [];
    lineGroups[y].push({
      text: item.str,
      x: item.transform[4], // X position for sorting
    });
  });

  // Sort by Y descending (top to bottom), then by X ascending (left to right)
  const sortedYs = Object.keys(lineGroups)
    .map(Number)
    .sort((a, b) => b - a);

  const lines = sortedYs.map(y => {
    const items = lineGroups[y].sort((a, b) => a.x - b.x);
    return items.map(item => item.text).join(' ').trim();
  });

  return lines.filter(line => line.length > 0);
}

/**
 * Parse extracted text into amount map
 */
function parseText(text) {
  const lines = text.split('\n');
  
  const amounts = {}; // { 'A01101': 377650, 'A01151': 52692597 }
  const occurrences = {}; // For debugging: { 'A01151': [51245434, 1447163] }
  
  let currentSection = null; // 'pays' | 'allowances' | 'deductions' | null
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section
    if (SECTION_TOTAL.test(line)) {
      // "Total Pays" etc. - section just ended
      // Don't process this line, but section might change in next lines
      continue;
    }
    
    if (SECTION_PAYS.test(line) && !line.includes('A01')) {
      currentSection = 'pays';
      continue;
    }
    if (SECTION_ALLOWANCES.test(line) && !line.includes('A01')) {
      currentSection = 'allowances';
      continue;
    }
    if (SECTION_DEDUCTIONS.test(line) && !line.includes('G06')) {
      currentSection = 'deductions';
      continue;
    }

    // Only process lines in Pays or Allowances sections
    if (currentSection !== 'pays' && currentSection !== 'allowances') {
      continue;
    }

    // Extract code from start of line
    const codeMatch = line.match(CODE_REGEX);
    if (!codeMatch) continue;

    const code = codeMatch[1].toUpperCase().trim();

    // Extract all amounts from this line - last one is "Total Employees"
    const matches = [...line.matchAll(AMOUNT_PATTERN)];
    if (matches.length === 0) continue;

    // Last match = Total Employees amount
    const lastMatch = matches[matches.length - 1];
    const amountStr = lastMatch[1].replace(/,/g, ''); // Remove commas
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount < 0) continue;

    // SUM amounts for same code
    amounts[code] = (amounts[code] || 0) + amount;
    
    // Track occurrences for debugging
    if (!occurrences[code]) occurrences[code] = [];
    occurrences[code].push(amount);
  }

  // Build summary
  const summary = {
    totalCodes: Object.keys(amounts).length,
    grandTotal: Object.values(amounts).reduce((sum, v) => sum + v, 0),
    occurrences,
  };

  return { amounts, summary };
}

/**
 * Match PDF amounts to user's budget heads
 * Returns: 
 *   - matched: { headId: amount } for heads that exist
 *   - missingCodes: [{ code, amount }] for codes in PDF but not in user's heads
 */
export function matchToBudgetHeads(pdfAmounts, budgetHeads) {
  const matched = {}; // { headCode: amount }
  const matchedHeads = []; // For display
  const missingCodes = []; // PDF codes not found in user's heads

  // Build a set of user's head codes (uppercase, trimmed)
  const userCodes = new Set(
    budgetHeads.map(h => h.code.toUpperCase().trim())
  );

  // Check each PDF code
  for (const [pdfCode, amount] of Object.entries(pdfAmounts)) {
    if (userCodes.has(pdfCode)) {
      matched[pdfCode] = amount;
      
      // Find the head detail for display
      const head = budgetHeads.find(
        h => h.code.toUpperCase().trim() === pdfCode
      );
      if (head) {
        matchedHeads.push({
          code: pdfCode,
          name: head.name,
          section: head.section,
          amount,
          headId: head.id,
        });
      }
    } else {
      missingCodes.push({ code: pdfCode, amount });
    }
  }

  return {
    matched,         // { 'A01101': 377650, ... } - for filling form
    matchedHeads,    // [{code, name, section, amount}] - for display
    missingCodes,    // [{code, amount}] - codes to add to budget heads
  };
}
