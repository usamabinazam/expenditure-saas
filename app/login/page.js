'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Pehle email enter karein');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });

    if (error) {
      setError(error.message);
    } else {
      alert('✅ Password reset link email pe bhej diya hai!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <div className="text-2xl font-bold text-emerald-700">📊 Expenditure Generator</div>
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Login</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50"
          >
            {loading ? 'Login ho raha hai...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-sm text-emerald-700 hover:underline"
          >
            Password bhool gaye?
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Account nahi hai?{' '}
          <Link href="/signup" className="text-emerald-700 hover:underline font-medium">
            Sign up karein
          </Link>
        </p>
      </div>
    </div>
  );
}
