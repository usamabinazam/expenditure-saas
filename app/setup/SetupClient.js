'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// VALIDATION HELPERS
// ============================================================

// Remove HTML tags + script injection attempts
const sanitizeInput = (str) => {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')        // Remove HTML tags
    .replace(/javascript:/gi, '')   // Remove javascript: protocol
    .replace(/on\w+=/gi, '')        // Remove event handlers (onclick, onerror, etc.)
    .trim();
};

// Field-specific validators - returns error string or null if valid
const validators = {
  name: (value) => {
    const v = sanitizeInput(value);
    if (!v) return 'School name zaroori hai';
    if (v.length < 3) return 'School name kam se kam 3 characters ka hona chahiye';
    if (v.length > 200) return 'School name 200 characters se kam hona chahiye';
    // Allow: letters, numbers, spaces, dots, dashes, slash, parentheses, comma, apostrophe
    if (!/^[a-zA-Z0-9\s.\-/(),']+$/.test(v)) {
      return 'School name mein sirf letters, numbers, spaces aur . - / ( ) , \' allowed hain';
    }
    return null;
  },

  district: (value) => {
    const v = sanitizeInput(value);
    if (!v) return 'District zaroori hai';
    if (v.length < 2) return 'District name kam se kam 2 characters ka hona chahiye';
    if (v.length > 100) return 'District name 100 characters se kam hona chahiye';
    if (!/^[a-zA-Z\s.\-]+$/.test(v)) {
      return 'District mein sirf letters aur spaces allowed hain';
    }
    return null;
  },

  ddo_code: (value) => {
    const v = sanitizeInput(value);
    if (!v) return 'DDO Code zaroori hai';
    if (v.length < 3) return 'DDO Code kam se kam 3 characters ka hona chahiye';
    if (v.length > 20) return 'DDO Code 20 characters se kam hona chahiye';
    if (!/^[a-zA-Z0-9\s\-]+$/.test(v)) {
      return 'DDO Code mein sirf letters, numbers, spaces aur dash allowed hain';
    }
    return null;
  },

  emis_code: (value) => {
    const v = sanitizeInput(value);
    if (!v) return null; // Optional field
    if (v.length > 20) return 'EMIS Code 20 characters se kam hona chahiye';
    if (!/^[a-zA-Z0-9\s\-]+$/.test(v)) {
      return 'EMIS Code mein sirf letters, numbers allowed hain';
    }
    return null;
  },

  department: (value) => {
    const v = sanitizeInput(value);
    if (!v) return 'Department zaroori hai';
    if (v.length < 2) return 'Department name kam se kam 2 characters ka hona chahiye';
    if (v.length > 100) return 'Department name 100 characters se kam hona chahiye';
    if (!/^[a-zA-Z\s.\-]+$/.test(v)) {
      return 'Department mein sirf letters allowed hain';
    }
    return null;
  },
};

export default function SetupClient({ userEmail, school, userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Per-field errors for real-time validation
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: school?.name || '',
    district: school?.district || 'ABBOTTABAD',
    ddo_code: school?.ddo_code || '',
    department: school?.department || 'EDUCATION',
    gender: school?.gender || 'Female',
    principal_designation: school?.principal_designation || 'PRINCIPAL',
    emis_code: school?.emis_code || '',
  });

  // ============================================================
  // Real-time field validation on change
  // ============================================================
  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });

    // Validate this field
    if (validators[field]) {
      const errorMsg = validators[field](value);
      setFieldErrors(prev => ({
        ...prev,
        [field]: errorMsg,
      }));
    }
  };

  // ============================================================
  // Validate all fields before submit
  // ============================================================
  const validateAll = () => {
    const errors = {};
    Object.keys(validators).forEach(field => {
      const errorMsg = validators[field](formData[field]);
      if (errorMsg) errors[field] = errorMsg;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation check
    if (!validateAll()) {
      setError('Form mein errors hain - ❌ wale fields theek karein');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Sanitize all string fields before sending to DB
    const sanitizedData = {
      name: sanitizeInput(formData.name),
      district: sanitizeInput(formData.district),
      ddo_code: sanitizeInput(formData.ddo_code),
      department: sanitizeInput(formData.department),
      gender: formData.gender, // dropdown - safe
      principal_designation: formData.principal_designation, // dropdown - safe
      emis_code: sanitizeInput(formData.emis_code),
    };

    if (school) {
      const { error: updateError } = await supabase
        .from('schools')
        .update(sanitizedData)
        .eq('id', school.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('schools')
        .insert({ ...sanitizedData, user_id: userId });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  // Helper: get input class based on error state
  const getInputClass = (field) => {
    const baseClass = "w-full px-3 py-2 border rounded focus:ring-2";
    if (fieldErrors[field]) {
      return `${baseClass} border-red-300 focus:ring-red-500 bg-red-50`;
    }
    return `${baseClass} border-gray-300 focus:ring-emerald-500`;
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
          {/* School Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School Name *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. G.G.H.S.S GARHI PHULGRAN"
              className={getInputClass('name')}
            />
            {fieldErrors.name ? (
              <p className="text-xs text-red-600 mt-1">❌ {fieldErrors.name}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Capital letters mein likhein (max 200 chars)</p>
            )}
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.district}
              onChange={(e) => handleFieldChange('district', e.target.value)}
              className={getInputClass('district')}
            />
            {fieldErrors.district && (
              <p className="text-xs text-red-600 mt-1">❌ {fieldErrors.district}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* DDO Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DDO Code *</label>
              <input
                type="text"
                required
                maxLength={20}
                value={formData.ddo_code}
                onChange={(e) => handleFieldChange('ddo_code', e.target.value)}
                placeholder="e.g. AD 6226"
                className={getInputClass('ddo_code')}
              />
              {fieldErrors.ddo_code && (
                <p className="text-xs text-red-600 mt-1">❌ {fieldErrors.ddo_code}</p>
              )}
            </div>

            {/* EMIS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EMIS Code (optional)
              </label>
              <input
                type="text"
                maxLength={20}
                value={formData.emis_code}
                onChange={(e) => handleFieldChange('emis_code', e.target.value)}
                placeholder="e.g. 12345"
                className={getInputClass('emis_code')}
              />
              {fieldErrors.emis_code && (
                <p className="text-xs text-red-600 mt-1">❌ {fieldErrors.emis_code}</p>
              )}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              maxLength={100}
              value={formData.department}
              onChange={(e) => handleFieldChange('department', e.target.value)}
              className={getInputClass('department')}
            />
            {fieldErrors.department && (
              <p className="text-xs text-red-600 mt-1">❌ {fieldErrors.department}</p>
            )}
          </div>

          {/* Gender + Designation (dropdowns - safe from XSS) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="HEADMASTER">HEADMASTER</option>
                <option value="HEADMISTRESS">HEADMISTRESS</option>
              </select>
            </div>
          </div>

          {/* Security info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            🔒 <strong>Security:</strong> Aapki data encrypted hai. HTML/script tags automatically remove ho jate hain.
          </div>

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={loading || Object.keys(fieldErrors).some(k => fieldErrors[k])}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : school ? 'Update Profile' : 'Save & Continue →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
