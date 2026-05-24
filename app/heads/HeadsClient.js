'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';

export default function HeadsClient({ userEmail, school, heads: initialHeads }) {
  const router = useRouter();
  const [heads, setHeads] = useState(initialHeads);
  const [newHead, setNewHead] = useState({
    section: 'pays',
    code: '',
    name: '',
  });

  const supabase = createClient();

  const pays = heads.filter((h) => h.section === 'pays');
  const allowances = heads.filter((h) => h.section === 'allowances');

  const handleAdd = async (e) => {
    e.preventDefault();

    // Check duplicate
    if (heads.some((h) => h.code === newHead.code.trim())) {
      alert('⚠️ Yeh code already exists!');
      return;
    }

    const maxOrder = Math.max(
      0,
      ...heads.filter((h) => h.section === newHead.section).map((h) => h.display_order || 0)
    );

    const { data, error } = await supabase
      .from('budget_heads')
      .insert({
        school_id: school.id,
        section: newHead.section,
        code: newHead.code.trim(),
        name: newHead.name.trim(),
        display_order: maxOrder + 1,
        budget: 0,
      })
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setHeads([...heads, data]);
    setNewHead({ section: 'pays', code: '', name: '' });
  };

  const handleUpdateBudget = async (id, budget) => {
    const { error } = await supabase
      .from('budget_heads')
      .update({ budget: parseFloat(budget) || 0 })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setHeads(heads.map((h) => (h.id === id ? { ...h, budget: parseFloat(budget) || 0 } : h)));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this head?')) return;

    const { error } = await supabase.from('budget_heads').delete().eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setHeads(heads.filter((h) => h.id !== id));
  };

  const renderTable = (sectionHeads, sectionName) => (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="bg-gray-900 text-white p-3 rounded-t-lg">
        <h2 className="font-bold">{sectionName}</h2>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 text-sm">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Head Name</th>
            <th className="text-right p-3">Budget (Rs.)</th>
            <th className="text-center p-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sectionHeads.map((h) => (
            <tr key={h.id} className="hover:bg-gray-50">
              <td className="p-3 font-mono text-sm">{h.code}</td>
              <td className="p-3">{h.name}</td>
              <td className="p-3 text-right">
                <input
                  type="number"
                  defaultValue={h.budget || 0}
                  onBlur={(e) => handleUpdateBudget(h.id, e.target.value)}
                  className="w-28 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                />
              </td>
              <td className="p-3 text-center">
                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📋 Budget Heads</h1>
        <p className="text-gray-600 mb-6">
          Standard KPK Education heads. Tum add/remove/edit kar sakte ho.
        </p>

        {/* Add new */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">➕ Naya Head Add Karein</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={newHead.section}
              onChange={(e) => setNewHead({ ...newHead, section: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="pays">PAYS</option>
              <option value="allowances">ALLOWANCES</option>
            </select>
            <input
              type="text"
              required
              value={newHead.code}
              onChange={(e) => setNewHead({ ...newHead, code: e.target.value })}
              placeholder="Code (e.g. A01234)"
              className="px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              required
              value={newHead.name}
              onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
              placeholder="Head Name"
              className="px-3 py-2 border border-gray-300 rounded md:col-span-2"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded"
            >
              Add Head
            </button>
          </form>
        </div>

        {renderTable(pays, 'PAYS')}
        {renderTable(allowances, 'REGULAR ALLOWANCES')}

        <p className="text-sm text-gray-500 mt-4">
          💡 <strong>Tip:</strong> Budget khaali (0) chod sakte ho agar abhi sanction nahi hua.
        </p>
      </main>
    </div>
  );
}
