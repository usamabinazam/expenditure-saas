'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { SECTIONS, MONTH_NAMES, formatNumber } from '@/lib/utils';

export default function PreviousDataClient({ userEmail, school, heads }) {
  const router = useRouter();
  const supabase = createClient();

  // Initialize edited values from existing previous_expenditure
  const initialValues = {};
  heads.forEach(h => {
    initialValues[h.id] = h.previous_expenditure || 0;
  });

  const [editedValues, setEditedValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getHeadsBySection = (sectionId) => heads.filter((h) => h.section === sectionId);

  const handleChange = (headId, value) => {
    setEditedValues({
      ...editedValues,
      [headId]: value,
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);

    const changes = [];
    heads.forEach((h) => {
      const newValue = parseFloat(editedValues[h.id]) || 0;
      const oldValue = parseFloat(h.previous_expenditure) || 0;
      if (newValue !== oldValue) {
        changes.push({ id: h.id, previous_expenditure: newValue });
      }
    });

    if (changes.length === 0) {
      setIsSaving(false);
      setHasChanges(false);
      alert('Koi change nahi hua. Pehle values edit karein.');
      return;
    }

    let errorCount = 0;
    for (const change of changes) {
      const { error } = await supabase
        .from('budget_heads')
        .update({ previous_expenditure: change.previous_expenditure })
        .eq('id', change.id);

      if (error) {
        errorCount++;
        console.error('Error:', change.id, error);
      }
    }

    setIsSaving(false);

    if (errorCount > 0) {
      alert(`⚠️ ${errorCount} entries save nahi hui. Phir try karein.`);
      return;
    }

    setHasChanges(false);
    setSaveSuccess(true);
    
    setTimeout(() => setSaveSuccess(false), 4000);
    router.refresh();
  };

  const handleResetAll = () => {
    if (!confirm('Sab previous expenditure values 0 kar di jaayein? Iska matlab pehle se entered data khatam ho jayega.')) return;
    
    const reset = {};
    heads.forEach(h => {
      reset[h.id] = 0;
    });
    setEditedValues(reset);
    setHasChanges(true);
  };

  // Calculate grand total of all entered previous expenditure
  const grandTotal = Object.values(editedValues).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  // Section icons
  const sectionStyles = {
    pays: { icon: '💰', color: 'emerald' },
    allowances: { icon: '🎁', color: 'blue' },
    non_salary: { icon: '🛠️', color: 'purple' },
  };

  // Determine current FY for guidance
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const fyStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const fyEndYear = fyStartYear + 1;

  // Calculate which months to include (Jul to last completed month of current FY)
  let monthsToInclude = '';
  if (currentMonth >= 7) {
    if (currentMonth === 7) {
      monthsToInclude = 'Naya FY abhi shuru hua - shayad zarurat nahi';
    } else {
      monthsToInclude = `July ${fyStartYear} se ${MONTH_NAMES[currentMonth - 1]} ${fyStartYear}`;
    }
  } else {
    if (currentMonth === 1) {
      monthsToInclude = `July ${fyStartYear} se December ${fyStartYear}`;
    } else {
      monthsToInclude = `July ${fyStartYear} se ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">📊 Previous Expenditure Data</h1>
          <div className="flex gap-2">
            <button
              onClick={handleResetAll}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              ↺ Reset All to 0
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || !hasChanges}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '⏳ Saving...' : '💾 Save All'}
            </button>
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          SaaS use karne se pehle ka <strong>head-wise total kharcha</strong> yahan set karein.
        </p>

        {/* Why this page banner */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
          <div className="font-bold text-blue-900 mb-2">🤔 Yeh Page Kyun?</div>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Agar aap <strong>mid-FY mein</strong> hamara SaaS use karna shuru kar rahe hain
              (e.g. March mein), to system ko pichle months ka data chahiye hoga.
            </p>
            <p>
              <strong>Example:</strong> Aap March 2027 mein join kiye to system ko July 2026 - February 2027 
              ka cumulative kharcha chahiye - taa ke March ka statement banate waqt Previous column sahi aaye.
            </p>
            <p className="bg-white p-2 rounded mt-2">
              <strong>📅 Current FY: {fyStartYear}-{String(fyEndYear).slice(-2)}</strong> ({MONTH_NAMES[7]} {fyStartYear} - {MONTH_NAMES[6]} {fyEndYear})<br/>
              <strong>📌 Aapko yeh data daalna chahiye:</strong> {monthsToInclude} ka cumulative kharcha
            </p>
          </div>
        </div>

        {/* How to use */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="font-bold text-emerald-900 mb-2">💡 Kaise Use Karein:</div>
          <ol className="text-sm text-emerald-800 space-y-1 list-decimal pl-5">
            <li>Har head ke saamne <strong>cumulative total</strong> daalein (Jul-Feb ka sum)</li>
            <li>Khaali heads (jin pe kharcha nahi tha) 0 chodein</li>
            <li>Sab fill karke <strong>"Save All"</strong> click karein</li>
            <li>Phir New Statement banate waqt automatic use hoga</li>
          </ol>
          <div className="text-xs text-emerald-700 mt-3 bg-white p-2 rounded">
            ⚠️ <strong>Note:</strong> Jab pehla statement save ho jayega is FY ka, uske baad yeh data 
            sirf reference ke liye rahega. Future statements cumulative chalte rahenge automatically.
          </div>
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="bg-green-100 border-2 border-green-400 rounded-lg p-4 mb-6">
            <div className="font-bold text-green-900">✅ Successfully Saved!</div>
            <div className="text-sm text-green-800 mt-1">
              Previous expenditure data save ho gaya. Ab New Statement banate waqt automatic use hoga.
            </div>
          </div>
        )}

        {/* Unsaved changes warning */}
        {hasChanges && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-6 text-sm text-amber-900">
            ⚠️ <strong>Unsaved Changes:</strong> Save All button click karna mat bhoolna!
          </div>
        )}

        {/* Grand Total Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-lg p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm opacity-90 uppercase font-bold">Total Previous Expenditure</div>
              <div className="text-3xl font-bold mt-1">Rs. {formatNumber(grandTotal)}</div>
              <div className="text-xs opacity-90 mt-1">
                All heads ka sum (Jul se ab tak ka cumulative)
              </div>
            </div>
            <div className="text-5xl opacity-50">📊</div>
          </div>
        </div>

        {/* Sections - 3 sections with their heads */}
        {SECTIONS.map((section) => {
          const sectionHeads = getHeadsBySection(section.id);
          if (sectionHeads.length === 0) return null;
          
          const style = sectionStyles[section.id];
          const sectionTotal = sectionHeads.reduce(
            (sum, h) => sum + (parseFloat(editedValues[h.id]) || 0), 
            0
          );

          return (
            <div key={section.id} className="bg-white rounded-lg shadow mb-6 overflow-hidden">
              {/* Section header */}
              <div className={`bg-${style.color}-700 text-white p-3 flex items-center justify-between`}>
                <h2 className="font-bold flex items-center gap-2">
                  <span>{style.icon}</span>
                  <span>{section.label}</span>
                </h2>
                <div className="text-sm">
                  Subtotal: <strong>Rs. {formatNumber(sectionTotal)}</strong>
                </div>
              </div>

              {/* Heads table */}
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase">
                  <tr>
                    <th className="text-left p-3 w-32">Code</th>
                    <th className="text-left p-3">Head Name</th>
                    <th className="text-right p-3 w-40">Budget (Rs.)</th>
                    <th className="text-right p-3 w-48">Previous Expenditure (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sectionHeads.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm text-gray-600">{h.code}</td>
                      <td className="p-3 text-sm">{h.name}</td>
                      <td className="p-3 text-right text-sm text-gray-500">
                        {h.budget ? formatNumber(h.budget) : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editedValues[h.id] || 0}
                          onChange={(e) => handleChange(h.id, e.target.value)}
                          className="w-36 px-2 py-1 border-2 border-emerald-400 rounded text-right text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          disabled={isSaving}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Floating Save Button */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-2xl disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? '⏳ Saving...' : '💾 Save All Changes'}
            </button>
          </div>
        )}

        {/* Back to dashboard */}
        <div className="text-center mt-6">
          <Link
            href="/dashboard"
            className="text-emerald-700 hover:underline font-medium"
          >
            ← Dashboard Pe Jao
          </Link>
        </div>
      </main>
    </div>
  );
}
