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
// FY 2026-27 = July 2026 to June 2027
// ============================================================

// Get the Financial Year start (year + month) for any given month/year
// Returns { year, month } of the July that started this FY
export function getFYStart(year, month) {
  if (month >= 7) {
    // July - December: this year ka July hi FY start hai
    return { year, month: 7 };
  } else {
    // January - June: pichle saal ka July FY start hai
    return { year: year - 1, month: 7 };
  }
}

// Check if a given month is start of new Financial Year
export function isNewFinancialYear(month) {
  return month === 7; // July
}

// ============================================================
// Get the statement just before the given month (for Previous column)
//
// SMART: Same FY ke andar hi cumulative chalega
// July ke statement mein Previous = 0 (naya FY start)
// August ke statement mein Previous = July ka Total
// June ke statement mein Previous = May ka Total (same FY ka)
// ============================================================
export function getPreviousStatement(statements, year, month) {
  // Naya FY start: July mein previous null hi rahega
  if (isNewFinancialYear(month)) {
    return null;
  }

  // FY ka start determine karo
  const fyStart = getFYStart(year, month);

  const sorted = [...statements].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month_num - b.month_num;
  });

  let previous = null;
  for (const s of sorted) {
    // Check 1: Statement current month se pehle ka hai?
    const isBeforeCurrent = (s.year < year || (s.year === year && s.month_num < month));

    // Check 2: Statement SAME FY ka hai? (FY July start se age ka)
    const isInSameFY = (s.year > fyStart.year) ||
                       (s.year === fyStart.year && s.month_num >= fyStart.month);

    if (isBeforeCurrent && isInSameFY) {
      previous = s;
    } else if (!isBeforeCurrent) {
      break; // Future statements - stop searching
    }
  }

  return previous;
}

// Calculate complete statement from this month's input data
export function calculateStatement(thisMonthData, previousStatement, heads) {
  const result = {
    pays: [],
    allowances: [],
    non_salary: [],
    pays_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    allowances_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    non_salary_subtotal: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
    grand_total: { budget: 0, this_month: 0, previous: 0, total: 0, saving: 0, excess: 0 },
  };

  // Build previous lookup from previous statement's totals
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

  // Process all 3 sections
  ['pays', 'allowances', 'non_salary'].forEach((section) => {
    const sectionHeads = heads.filter((h) => h.section === section);
    sectionHeads.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    sectionHeads.forEach((head) => {
      const thisMonth = parseFloat(thisMonthData[head.code]) || 0;
      const previous = prevLookup[head.code] || 0;
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

  // Grand total - sum of all 3 sections
  ['budget', 'this_month', 'previous', 'total', 'saving', 'excess'].forEach((key) => {
    result.grand_total[key] =
      result.pays_subtotal[key] +
      result.allowances_subtotal[key] +
      result.non_salary_subtotal[key];
  });

  return result;
}
