'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // checking if user has valid reset session
  const [validSession, setValidSession] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Check if user has a valid recovery session
  // Supabase auto-creates a session when user clicks the reset link
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // If user has session (came from email link), allow reset
      if (session) {
        setValidSession(true);
      } else {
        setValidSession(false);
      }
      setChecking(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords match nahi karte');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: formData.password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Auto-redirect to login after 3 seconds
    setTimeout(() => {
      supabase.auth.signOut(); // Sign out so user logs in fresh
      router.push('/login');
    }, 3000);
  };

  // ============================================================
  // CHECKING SESSION (loading state)
  // ============================================================
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-emerald-700 text-lg">Loading...</div>
      </div>
    );
  }

  // ============================================================
  // INVALID SESSION - user came here without clicking email link
  // ============================================================
  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Invalid ya Expired Link
            </h1>
            <p className="text-gray-600">
              Reset link kaam nahi kar raha. Naya link request karein.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm text-amber-900">
            <strong>Wajah ho sakti hai:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Link expire ho gaya (1 hour ke baad)</li>
              <li>Link already use ho chuka hai</li>
              <li>Aap direct yeh page khol rahe hain (email se aana zaruri hai)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-center"
            >
              🔄 Naya Reset Link Request Karo
            </Link>
            <Link
              href="/login"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg text-center"
            >
              ← Login Page Pe Jao
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Password Update Ho Gaya!
          </h1>
          <p className="text-gray-600 mb-6">
            Ab apne naye password se login karein
          </p>
          <p className="text-sm text-gray-500 mb-4">
            3 second mein automatic login page khulega...
          </p>
          <Link
            href="/login"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Login Karein →
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // RESET FORM
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <div className="text-2xl font-bold text-emerald-700">📊 Expenditure Generator</div>
        </Link>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Naya Password Set Karein</h1>
          <p className="text-gray-600 text-sm">
            Apna naya password choose karein
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naya Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
              placeholder="Kam se kam 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Naya Password *
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
              placeholder="Dobara likhein"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Update ho raha hai...' : '✓ Password Update Karein'}
          </button>
        </form>
      </div>
    </div>
  );
}
