// Format number with commas
export function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Month names array
export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Sections array - used throughout the app
export const SECTIONS = [
  { id: 'pays', label: 'PAYS' },
  { id: 'allowances', label: 'REGULAR ALLOWANCES' },
  { id: 'non_salary', label: 'NON-SALARY COMPONENTS' },
];

// ============================================================
// FINANCIAL YEAR HELPERS
// Pakistan Government FY: July → June
// ============================================================

export function getFYStart(year, month) {
  if (month >= 7) {
    return { year, month: 7 };
  } else {
    return { year: year - 1, month: 7 };
  }
}

export function isNewFinancialYear(month) {
  return month === 7; // July
}

// ============================================================
// SMART getPreviousStatement
//
// Logic:
// - July → return null (new FY, Previous = 0)
// - Other months in FY → return last statement from SAME FY
// - If no statement found in FY → return null (will fall back to budget_heads)
// ============================================================
export function getPreviousStatement(statements, year, month) {
  if (isNewFinancialYear(month)) {
    return null;
  }

  const fyStart = getFYStart(year, month);

  const sorted = [...statements].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month_num - b.month_num;
  });

  let previous = null;
  for (const s of sorted) {
    const isBeforeCurrent = (s.year < year || (s.year === year && s.month_num < month));
    const isInSameFY = (s.year > fyStart.year) ||
                       (s.year === fyStart.year && s.month_num >= fyStart.month);

    if (isBeforeCurrent && isInSameFY) {
      previous = s;
    } else if (!isBeforeCurrent) {
      break;
    }
  }

  return previous;
}

// ============================================================
// CALCULATE STATEMENT - Smart with previous_expenditure fallback
//
// Previous column priority:
// 1. previousStatement.data.total (from previous month's statement)
// 2. head.previous_expenditure (user-set manual data, for first statement of FY)
// 3. 0 (default)
//
// Only July (new FY) resets to 0 - that case already handled by previousStatement = null
// ============================================================
export function calculateStatement(thisMonthData, previousStatement, heads, currentMonth = null) {
  const result = {
    pays: [],
    allowances: [],
    non_salary: [],
    pays_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    allowances_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    non_salary_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    grand_total: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
  };

  // Build previous lookup from previous statement's totals (if exists)
  const prevLookup = {};
  if (previousStatement && previousStatement.data) {
    const prevData = previousStatement.data;
    [
      ...(prevData.pays || []),
      ...(prevData.allowances || []),
      ...(prevData.non_salary || []),
    ].forEach((item) => {
      prevLookup[item.code] = item.total;
    });
  }

  // Should we use manual previous_expenditure?
  // YES if:
  // - This is NOT July (new FY)
  // - There's NO previousStatement (first statement of FY for this user)
  const useManualPrevious = !previousStatement && currentMonth !== 7;

  // Process all 3 sections
  ['pays', 'allowances', 'non_salary'].forEach((section) => {
    const sectionHeads = heads.filter((h) => h.section === section);
    sectionHeads.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    sectionHeads.forEach((head) => {
      const thisMonth = parseFloat(thisMonthData[head.code]) || 0;

      // SMART PREVIOUS: 
      // 1. From previous statement (cumulative)
      // 2. From manual previous_expenditure (first-time use)
      // 3. 0 (default)
      let previous = 0;
      if (prevLookup[head.code] !== undefined) {
        previous = prevLookup[head.code];
      } else if (useManualPrevious) {
        previous = parseFloat(head.previous_expenditure) || 0;
      }

      const total = thisMonth + previous;
      const budget = parseFloat(head.budget) || 0;
      const saving = budget > 0 ? Math.max(0, budget - total) : 0;
      const excess = budget > 0 ? Math.max(0, total - budget) : total;

      const item = {
        code: head.code,
        name: head.name,
        budget,
        this_month: thisMonth,
        previous,
        total,
        saving,
        excess,
      };

      result[section].push(item);

      const subtotalKey = section + '_subtotal';
      result[subtotalKey].budget += budget;
      result[subtotalKey].this_month += thisMonth;
      result[subtotalKey].previous += previous;
      result[subtotalKey].total += total;
      result[subtotalKey].saving += saving;
      result[subtotalKey].excess += excess;
    });
  });

  // Grand total
  ['budget', 'this_month', 'previous', 'total', 'saving', 'excess'].forEach((key) => {
    result.grand_total[key] =
      result.pays_subtotal[key] +
      result.allowances_subtotal[key] +
      result.non_salary_subtotal[key];
  });

  return result;
}
