'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupClient({ userEmail, school, userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: school?.name || '',
    district: school?.district || 'ABBOTTABAD',
    ddo_code: school?.ddo_code || '',
    department: school?.department || 'EDUCATION',
    gender: school?.gender || 'Female',
    principal_designation: school?.principal_designation || 'PRINCIPAL',
    emis_code: school?.emis_code || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    if (school) {
      // Update
      const { error: updateError } = await supabase
        .from('schools')
        .update(formData)
        .eq('id', school.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      // Create
      const { error: insertError } = await supabase
        .from('schools')
        .insert({ ...formData, user_id: userId });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🏫 School Profile</h1>
        <p className="text-gray-600 mb-6">
          School ki details fill karein. Yeh PDF mein use hogi.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. G.G.H.S.S GARHI PHULGRAN"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">Capital letters mein likhein</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
            <input
              type="text"
              required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DDO Code *</label>
              <input
                type="text"
                required
                value={formData.ddo_code}
                onChange={(e) => setFormData({ ...formData, ddo_code: e.target.value })}
                placeholder="e.g. AD 6226"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EMIS Code (optional)
              </label>
              <input
                type="text"
                value={formData.emis_code}
                onChange={(e) => setFormData({ ...formData, emis_code: e.target.value })}
                placeholder="e.g. 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Principal Designation
              </label>
              <select
                value={formData.principal_designation}
                onChange={(e) =>
                  setFormData({ ...formData, principal_designation: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="HEADMASTER">HEADMASTER</option>
                <option value="HEADMISTRESS">HEADMISTRESS</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50"
            >
              {loading ? 'Saving...' : school ? 'Update Profile' : 'Save & Continue →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
