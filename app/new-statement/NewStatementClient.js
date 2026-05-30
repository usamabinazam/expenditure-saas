'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateStatement, getPreviousStatement, MONTH_NAMES, SECTIONS, isNewFinancialYear } from '@/lib/utils';

export default function NewStatementClient({ userEmail, school, heads, statements }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showFYPopup, setShowFYPopup] = useState(false);
  const [fyAcknowledged, setFyAcknowledged] = useState(false);

  // Smart defaults: next month after the latest one
  const today = new Date();
  let defaultMonth = today.getMonth() + 1;
  let defaultYear = today.getFullYear();

  if (statements.length > 0) {
    const latest = statements[0];
    let nm = latest.month_num + 1;
    let ny = latest.year;
    if (nm > 12) {
      nm = 1;
      ny++;
    }
    defaultMonth = nm;
    defaultYear = ny;
  }

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [amounts, setAmounts] = useState({});

  // ============================================================
  // FY POPUP TRIGGER
  // Show popup when:
  // - Month is July (new FY start)
  // - User has previous statements (matlab pichla FY tha)
  // - User hasn't acknowledged yet for this month/year combo
  // ============================================================
  useEffect(() => {
    if (isNewFinancialYear(month) && statements.length > 0 && !fyAcknowledged) {
      // Check if there's any statement from previous FY (before this July)
      const hasPreviousFY = statements.some(s => {
        // Previous FY = June ya pehle (same year ka), ya pichle saal ka
        return (s.year < year) || (s.year === year && s.month_num < 7);
      });

      if (hasPreviousFY) {
        setShowFYPopup(true);
      }
    }
  }, [month, year, statements, fyAcknowledged]);

  // Reset acknowledgment when month/year changes
  useEffect(() => {
    setFyAcknowledged(false);
  }, [month, year]);

  // Get heads by section helper
  const getHeadsBySection = (sectionId) => heads.filter((h) => h.section === sectionId);

  const handleFYConfirm = () => {
    setFyAcknowledged(true);
    setShowFYPopup(false);
  };

  const handleFYCancel = () => {
    setShowFYPopup(false);
    router.push('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Safety check - if July aur user ne acknowledge nahi kiya
    if (isNewFinancialYear(month) && statements.length > 0 && !fyAcknowledged) {
      setShowFYPopup(true);
      return;
    }

    setLoading(true);

    const previousStatement = getPreviousStatement(statements, year, month);
    const calc = calculateStatement(amounts, previousStatement, heads);

    const statementData = {
      school_id: school.id,
      year,
      month_num: month,
      month_name: MONTH_NAMES[month],
      data: {
        month_year: `${MONTH_NAMES[month].toUpperCase()} ${year}`,
        ...calc,
      },
    };

    const supabase = createClient();

    const existing = statements.find((s) => s.year === year && s.month_num === month);

    let result;
    if (existing) {
      result = await supabase
        .from('statements')
        .update({ data: statementData.data })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('statements')
        .insert(statementData)
        .select()
        .single();
    }

    if (result.error) {
      alert('Error: ' + result.error.message);
      setLoading(false);
      return;
    }

    router.push(`/statement/${result.data.id}`);
  };

  const renderInputRow = (head) => (
    <div key={head.id} className="grid grid-cols-12 gap-3 items-center">
      <div className="col-span-2 font-mono text-sm text-gray-600">{head.code}</div>
      <div className="col-span-7 text-sm">{head.name}</div>
      <div className="col-span-3">
        <input
          type="number"
          step="0.01"
          placeholder="0"
          value={amounts[head.code] || ''}
          onChange={(e) => setAmounts({ ...amounts, [head.code]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded text-right"
        />
      </div>
    </div>
  );

  // Section icons + colors
  const sectionStyles = {
    pays: { icon: '💰', bg: 'bg-white' },
    allowances: { icon: '🎁', bg: 'bg-gray-50' },
    non_salary: { icon: '🛠️', bg: 'bg-white' },
  };

  // Calculate previous and next FY for the popup message
  const fyPrev = year > 0 ? `${year - 1}-${String(year).slice(-2)}` : '';
  const fyNew = `${year}-${String(year + 1).slice(-2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      {/* ============================================================
          NEW FY POPUP MODAL
          ============================================================ */}
      {showFYPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🆕</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">New Financial Year!</h2>
                <div className="text-sm text-gray-600">FY {fyNew} start ho raha hai</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-blue-900 space-y-2">
                <p>
                  <strong>July {year}</strong> = Pakistan Government ka <strong>naya Financial Year</strong>.
                </p>
                <p>
                  Pichla year (FY {fyPrev}) khatam ho gaya hai. Naya year fresh start hoga.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="font-bold text-emerald-900 mb-2">✅ Kya Hoga:</div>
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>• Pichle FY ka data <strong>save rahega</strong> (history mein dikhega)</li>
                <li>• Naye statement mein <strong>Previous = 0</strong> hoga</li>
                <li>• Naya budget set karne ke liye <strong>Manage Heads</strong> use karein</li>
                <li>• Sab fresh - jaise pehla mahina ho</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-900">
              💡 <strong>Tip:</strong> Pehle <strong>Manage Heads</strong> jaake naya budget set kar lein, 
              phir July ka statement banayein.
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleFYCancel}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
              >
                ✗ Cancel
              </button>
              <button
                onClick={() => {
                  setFyAcknowledged(true);
                  setShowFYPopup(false);
                  router.push('/heads');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                📋 Pehle Budget Set Karo
              </button>
              <button
                onClick={handleFYConfirm}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
              >
                ✓ Naya FY Start Karo
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📄 New Monthly Statement</h1>
        <p className="text-gray-600 mb-6">
          Sirf <strong>"This Month"</strong> ka data fill karein. Previous, Total, Saving, Excess sab automatic.
        </p>

        {/* FY indicator banner when July is selected */}
        {isNewFinancialYear(month) && fyAcknowledged && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 mb-4 text-sm text-emerald-900">
            🆕 <strong>New Financial Year {fyNew}:</strong> Previous = 0 (naya year - fresh start)
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          {/* Month selector */}
          <div className="p-6 border-b bg-gray-50 rounded-t-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {MONTH_NAMES.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  min="2020"
                  max="2050"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Render all 3 sections dynamically */}
          {SECTIONS.map((section, index) => {
            const sectionHeads = getHeadsBySection(section.id);
            if (sectionHeads.length === 0) return null;

            const style = sectionStyles[section.id];
            const isAlternate = index % 2 === 1;

            return (
              <div
                key={section.id}
                className={`p-6 ${isAlternate ? 'bg-gray-50' : 'bg-white'} ${index > 0 ? 'border-t' : ''}`}
              >
                <h2 className="font-bold text-lg text-gray-800 mb-3 pb-2 border-b">
                  {style.icon} {section.label}
                </h2>
                <div className="space-y-2">
                  {sectionHeads.map(renderInputRow)}
                </div>
              </div>
            );
          })}

          {/* Submit */}
          <div className="p-6 border-t bg-white rounded-b-lg">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded text-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Generate Statement →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
