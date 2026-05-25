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

  // MASTER EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBudgets, setEditedBudgets] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const supabase = createClient();

  const pays = heads.filter((h) => h.section === 'pays');
  const allowances = heads.filter((h) => h.section === 'allowances');

  // ADD NEW HEAD
  const handleAdd = async (e) => {
    e.preventDefault();

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

  // MASTER EDIT MODE - START
  const handleStartEditMode = () => {
    const initial = {};
    heads.forEach((h) => {
      initial[h.id] = h.budget || 0;
    });
    setEditedBudgets(initial);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
  };

  // BUDGET CHANGE
  const handleBudgetChange = (headId, value) => {
    setEditedBudgets({
      ...editedBudgets,
      [headId]: value,
    });
    setHasUnsavedChanges(true);
  };

  // SAVE ALL
  const handleSaveAll = async () => {
    setIsSaving(true);

    const changes = [];
    heads.forEach((h) => {
      const newValue = parseFloat(editedBudgets[h.id]) || 0;
      const oldValue = parseFloat(h.budget) || 0;
      if (newValue !== oldValue) {
        changes.push({ id: h.id, budget: newValue });
      }
    });

    if (changes.length === 0) {
      setIsEditMode(false);
      setHasUnsavedChanges(false);
      setIsSaving(false);
      return;
    }

    let errorCount = 0;
    for (const change of changes) {
      const { error } = await supabase
        .from('budget_heads')
        .update({ budget: change.budget })
        .eq('id', change.id);

      if (error) {
        errorCount++;
        console.error('Error updating head:', change.id, error);
      }
    }

    if (errorCount > 0) {
      alert(`⚠️ ${errorCount} budgets save nahi ho saki. Phir se try karein.`);
      setIsSaving(false);
      return;
    }

    setHeads(
      heads.map((h) => {
        const change = changes.find((c) => c.id === h.id);
        return change ? { ...h, budget: change.budget } : h;
      })
    );

    setIsEditMode(false);
    setHasUnsavedChanges(false);
    setIsSaving(false);

    alert(`✅ ${changes.length} budget(s) successfully save ho gaye!`);
  };

  // CANCEL
  const handleCancelEditMode = () => {
    if (hasUnsavedChanges) {
      if (!confirm('⚠️ Tumne kuch changes kiye hain. Cancel karne se woh khoi jaayenge. Continue?')) {
        return;
      }
    }
    setIsEditMode(false);
    setEditedBudgets({});
    setHasUnsavedChanges(false);
  };

  // DELETE HEAD
  const handleDelete = async (id) => {
    if (!confirm('Yeh head delete karein?')) return;

    const { error } = await supabase.from('budget_heads').delete().eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setHeads(heads.filter((h) => h.id !== id));
  };

  // DRAG AND DROP
  const handleDragStart = (e, head) => {
    if (isEditMode) {
      e.preventDefault();
      return;
    }
    setDraggedItem(head);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e, head) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedItem && draggedItem.id !== head.id && draggedItem.section === head.section) {
      setDragOverItem(head.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetHead) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.id === targetHead.id) return;

    if (draggedItem.section !== targetHead.section) {
      alert('⚠️ Heads ko sirf apne section mein move kar sakte hain');
      return;
    }

    const sectionHeads = heads
      .filter((h) => h.section === draggedItem.section)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const draggedIndex = sectionHeads.findIndex((h) => h.id === draggedItem.id);
    const targetIndex = sectionHeads.findIndex((h) => h.id === targetHead.id);

    const reordered = [...sectionHeads];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const updates = reordered.map((head, index) => ({
      id: head.id,
      newOrder: index + 1,
    }));

    const newHeads = heads.map((h) => {
      const update = updates.find((u) => u.id === h.id);
      return update ? { ...h, display_order: update.newOrder } : h;
    });
    setHeads(newHeads);

    for (const update of updates) {
      await supabase
        .from('budget_heads')
        .update({ display_order: update.newOrder })
        .eq('id', update.id);
    }
  };

  // RENDER TABLE
  const renderTable = (sectionHeads, sectionName) => (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="bg-gray-900 text-white p-3 rounded-t-lg flex items-center justify-between">
        <h2 className="font-bold">{sectionName}</h2>
        {!isEditMode && (
          <span className="text-xs text-gray-300">
            💡 Drag rows to reorder
          </span>
        )}
      </div>
      <table className="w-full">
        <thead className="bg-gray-50 text-sm">
          <tr>
            {!isEditMode && <th className="w-12 text-center p-3"></th>}
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Head Name</th>
            <th className="text-right p-3">Budget (Rs.)</th>
            {!isEditMode && <th className="text-center p-3 w-32">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sectionHeads.map((h) => {
            const isDragOver = dragOverItem === h.id;

            return (
              <tr
                key={h.id}
                draggable={!isEditMode}
                onDragStart={(e) => handleDragStart(e, h)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, h)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, h)}
                className={`
                  hover:bg-gray-50 transition-colors
                  ${isDragOver ? 'bg-emerald-50 border-t-2 border-emerald-500' : ''}
                  ${isEditMode ? 'bg-yellow-50' : 'cursor-move'}
                `}
              >
                {!isEditMode && (
                  <td className="text-center p-3 text-gray-400">
                    <span className="text-lg select-none" title="Drag to reorder">
                      ⋮⋮
                    </span>
                  </td>
                )}

                <td className="p-3 font-mono text-sm">{h.code}</td>
                <td className="p-3">{h.name}</td>

                <td className="p-3 text-right">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={editedBudgets[h.id] || 0}
                      onChange={(e) => handleBudgetChange(h.id, e.target.value)}
                      className="w-32 px-2 py-1 border-2 border-emerald-400 rounded text-right text-sm focus:outline-none focus:border-emerald-600"
                      disabled={isSaving}
                    />
                  ) : (
                    <span className="font-medium">
                      {h.budget ? Number(h.budget).toLocaleString() : '0'}
                    </span>
                  )}
                </td>

                {!isEditMode && (
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">📋 Budget Heads</h1>

          {!isEditMode ? (
            <button
              onClick={handleStartEditMode}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md flex items-center gap-2"
            >
              ✏️ Edit All Budgets
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEditMode}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50"
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <>⏳ Saving...</> : <>💾 Save All Changes</>}
              </button>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          {isEditMode
            ? '📝 Edit mode mein hain - sab budgets fill karein, phir Save All click karein.'
            : 'Standard KPK Education heads. Edit budgets, drag to reorder, ya add/remove karein.'}
        </p>

        {isEditMode && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✏️</div>
              <div className="flex-1">
                <div className="font-bold text-yellow-900">Edit Mode Active</div>
                <div className="text-sm text-yellow-800 mt-1">
                  Sab rows editable hain. Budget values change karein aur upar wala
                  <strong> "💾 Save All Changes"</strong> click karein.
                </div>
                {hasUnsavedChanges && (
                  <div className="text-sm text-orange-700 mt-2 font-medium">
                    ⚠️ Tumne changes kiye hain - save karna mat bhoolna!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isEditMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-800 space-y-1">
              <div>✏️ <strong>Edit All Budgets:</strong> Upar wala blue button click karein - sab rows ek saath editable hongi.</div>
              <div>🔃 <strong>Reorder:</strong> Row ko drag karke upar/neeche move karein (same section mein).</div>
              <div>🗑️ <strong>Delete:</strong> Koi head zarurat nahi to Delete karein.</div>
            </div>
          </div>
        )}

        {!isEditMode && (
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
        )}

        {renderTable(pays, 'PAYS')}
        {renderTable(allowances, 'REGULAR ALLOWANCES')}

        {isEditMode && (
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

        <p className="text-sm text-gray-500 mt-4">
          💡 <strong>Tip:</strong> Budget khaali (0) chod sakte ho agar abhi sanction nahi hua.
        </p>
      </main>
    </div>
  );
}
