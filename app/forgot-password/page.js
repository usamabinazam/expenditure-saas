'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    // Send password reset email
    // Redirect to /reset-password where user will set new password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  // ============================================================
  // SUCCESS STATE - Full-screen confirmation
  // ============================================================
  if (sent) {
    const emailDomain = email.split('@')[1]?.toLowerCase() || '';
    let inboxUrl = 'https://mail.google.com';
    if (emailDomain.includes('gmail')) inboxUrl = 'https://mail.google.com';
    else if (emailDomain.includes('yahoo')) inboxUrl = 'https://mail.yahoo.com';
    else if (emailDomain.includes('outlook') || emailDomain.includes('hotmail')) {
      inboxUrl = 'https://outlook.live.com';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">📧</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Reset Link Bheja Hai!
            </h1>
            <p className="text-gray-600">
              Apne email pe link check karein
            </p>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-5 text-center">
            <div className="text-xs text-emerald-700 uppercase font-bold mb-1">
              Email Bheja Hai:
            </div>
            <div className="font-mono font-bold text-emerald-900 break-all">
              {email}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <div className="font-bold text-blue-900 mb-2">📋 Ab Kya Karna:</div>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal pl-5">
              <li><strong>Email kholo</strong></li>
              <li><strong>"Reset Password"</strong> wala email dhundo</li>
              <li><strong>"Reset Password"</strong> link click karo</li>
              <li>Naya password set karo aur login karo</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-900">
            💡 <strong>Tip:</strong> Email nahi mil raha? <strong>Spam/Junk</strong> folder check karein.
          </div>

          <div className="space-y-3">
            <a
              href={inboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-center"
            >
              📬 Email Kholo (Inbox)
            </a>
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
  // FORM STATE
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <div className="text-2xl font-bold text-emerald-700">📊 Expenditure Generator</div>
        </Link>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Password Reset</h1>
          <p className="text-gray-600 text-sm">
            Apna email daalein, hum reset link bhej denge
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
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wahi email jo signup ke waqt use kiya tha
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Bhej raha hai...' : '📧 Reset Link Bhejo'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Yaad aa gaya?{' '}
          <Link href="/login" className="text-emerald-700 hover:underline font-medium">
            Login karein
          </Link>
        </p>
      </div>
    </div>
  );
}
