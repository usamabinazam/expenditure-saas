'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupComplete, setSignupComplete] = useState(false); // NEW: full-screen success
  const [signupEmail, setSignupEmail] = useState(''); // Remember email for success screen
  const [referralValid, setReferralValid] = useState(null);
  const [referrerEmail, setReferrerEmail] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });

  // Auto-fill referral code from URL (?ref=USA456)
  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      const code = refFromUrl.toUpperCase().trim();
      setFormData(prev => ({ ...prev, referralCode: code }));
      validateReferralCode(code);
    }
  }, [searchParams]);

  // Validate referral code via public RPC
  const validateReferralCode = async (code) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerEmail('');
      return;
    }

    setValidatingCode(true);
    const supabase = createClient();

    const { data, error: lookupError } = await supabase
      .rpc('lookup_referral_code', { code_to_check: code.toUpperCase().trim() });

    setValidatingCode(false);

    if (lookupError || !data || data.length === 0) {
      setReferralValid(false);
      setReferrerEmail('');
    } else {
      setReferralValid(true);
      const email = data[0].email;
      const masked = email.replace(/^(.).*(@.*)$/, '$1***$2');
      setReferrerEmail(masked);
    }
  };

  const handleReferralChange = (e) => {
    const code = e.target.value.toUpperCase().trim();
    setFormData({ ...formData, referralCode: code });

    if (code.length >= 4) {
      validateReferralCode(code);
    } else {
      setReferralValid(null);
      setReferrerEmail('');
    }
  };

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

    if (formData.referralCode && referralValid === false) {
      setError('Referral code galat hai. Sahi code daalein ya khali chhodein.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // 1. Create auth account
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Link referral if valid
    if (signUpData.user && formData.referralCode && referralValid === true) {
      try {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', formData.referralCode)
          .single();

        if (referrer) {
          await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', signUpData.user.id);

          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referee_id: signUpData.user.id,
            referral_code: formData.referralCode,
            status: 'pending',
          });
        }
      } catch (err) {
        console.error('Referral linking failed:', err);
      }
    }

    // 3. Show full-screen success state
    if (signUpData.user) {
      setSignupEmail(formData.email);
      setSignupComplete(true);
    }

    setLoading(false);
  };

  // ============================================================
  // FULL-SCREEN SUCCESS STATE - User ko clearly batata hai kya karna hai
  // ============================================================
  if (signupComplete) {
    const emailDomain = signupEmail.split('@')[1]?.toLowerCase() || '';
    let inboxUrl = 'https://mail.google.com'; // default
    if (emailDomain.includes('gmail')) inboxUrl = 'https://mail.google.com';
    else if (emailDomain.includes('yahoo')) inboxUrl = 'https://mail.yahoo.com';
    else if (emailDomain.includes('outlook') || emailDomain.includes('hotmail')) {
      inboxUrl = 'https://outlook.live.com';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Big success icon */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">📧</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Account Ban Gaya!
            </h1>
            <p className="text-gray-600">
              Ab sirf <strong>email verify</strong> karna hai
            </p>
          </div>

          {/* Email box */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-5 text-center">
            <div className="text-xs text-emerald-700 uppercase font-bold mb-1">
              Verification Email Bheja Hai:
            </div>
            <div className="font-mono font-bold text-emerald-900 break-all">
              {signupEmail}
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <div className="font-bold text-blue-900 mb-2">📋 Ab Kya Karna:</div>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal pl-5">
              <li>
                <strong>Email kholo</strong> (Gmail/Yahoo jo bhi use karte ho)
              </li>
              <li>
                <strong>"Confirm your email"</strong> wala email dhundo
              </li>
              <li>
                <strong>"Confirm email address"</strong> link click karo
              </li>
              <li>Phir niche se <strong>Login</strong> karo</li>
            </ol>
          </div>

          {/* Warning if not found */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-900">
            💡 <strong>Tip:</strong> Email nahi mil raha? <strong>Spam/Junk</strong> folder check karein. 
            Sender: <strong>Supabase Auth</strong> ya <strong>noreply@mail.app.supabase.io</strong>
          </div>

          {/* Action buttons */}
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

          <p className="text-xs text-gray-500 text-center mt-5">
            Email verify karne ke baad hi login ho sakega
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // SIGNUP FORM (normal state)
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <div className="text-2xl font-bold text-emerald-700">📊 Expenditure Generator</div>
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-600 mb-6">Free trial - koi credit card nahi chahiye</p>

        {/* Referral bonus banner */}
        {referralValid === true && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">🎁</span>
              <div className="text-sm">
                <div className="font-bold text-emerald-900">Referral Active!</div>
                <div className="text-emerald-800 text-xs mt-1">
                  <strong>{referrerEmail}</strong> ne aapko invite kiya hai.
                </div>
                <div className="text-emerald-700 text-xs mt-1">
                  💰 First payment pe discount milega: Rs.50 (Basic Monthly) tak Rs.1000 (Multi Yearly)
                </div>
              </div>
            </div>
          </div>
        )}

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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
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
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Referral Code - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referral Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.referralCode}
                onChange={handleReferralChange}
                className={`w-full px-3 py-2 border rounded focus:ring-2 uppercase font-mono ${
                  referralValid === true
                    ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50'
                    : referralValid === false
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-emerald-500'
                }`}
                placeholder="USA456"
                maxLength={20}
              />
              {validatingCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  Checking...
                </div>
              )}
              {!validatingCode && referralValid === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">
                  ✓
                </div>
              )}
              {!validatingCode && referralValid === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold">
                  ✗
                </div>
              )}
            </div>
            {referralValid === false && (
              <p className="text-xs text-red-600 mt-1">Yeh code valid nahi hai</p>
            )}
            {referralValid === null && formData.referralCode.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Kisi friend ne invite kiya? Code daalein discount ke liye
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Account ban raha hai...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Pehle se account hai?{' '}
          <Link href="/login" className="text-emerald-700 hover:underline font-medium">
            Login karein
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-emerald-700">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
