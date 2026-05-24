'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateStatement, getPreviousStatement, MONTH_NAMES } from '@/lib/utils';

export default function NewStatementClient({ userEmail, school, heads, statements }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const pays = heads.filter((h) => h.section === 'pays');
  const allowances = heads.filter((h) => h.section === 'allowances');

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    
    // Upsert (insert or update if exists)
    const existing = statements.find(s => s.year === year && s.month_num === month);
    
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📄 New Monthly Statement</h1>
        <p className="text-gray-600 mb-6">
          Sirf <strong>"This Month"</strong> ka data fill karein. Previous, Total, Saving, Excess sab automatic.
        </p>

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

          {/* PAYS */}
          <div className="p-6">
            <h2 className="font-bold text-lg text-gray-800 mb-3 pb-2 border-b">💰 PAYS</h2>
            <div className="space-y-2">{pays.map(renderInputRow)}</div>
          </div>

          {/* ALLOWANCES */}
          <div className="p-6 border-t bg-gray-50">
            <h2 className="font-bold text-lg text-gray-800 mb-3 pb-2 border-b">
              🎁 REGULAR ALLOWANCES
            </h2>
            <div className="space-y-2">{allowances.map(renderInputRow)}</div>
          </div>

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
