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
  const [success, setSuccess] = useState('');
  const [referralValid, setReferralValid] = useState(null);
  const [referrerEmail, setReferrerEmail] = useState('');
  const [referrerId, setReferrerId] = useState(null);
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

  // Validate referral code using PUBLIC FUNCTION (bypasses RLS)
  const validateReferralCode = async (code) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      setReferrerEmail('');
      setReferrerId(null);
      return;
    }

    setValidatingCode(true);
    const supabase = createClient();

    // Use the SECURITY DEFINER function - works for anonymous users
    const { data, error: lookupError } = await supabase
      .rpc('lookup_referral_code', { check_code: code.toUpperCase().trim() });

    setValidatingCode(false);

    if (lookupError) {
      console.error('Lookup error:', lookupError);
      setReferralValid(false);
      setReferrerEmail('');
      setReferrerId(null);
      return;
    }

    if (!data || data.length === 0) {
      setReferralValid(false);
      setReferrerEmail('');
      setReferrerId(null);
    } else {
      setReferralValid(true);
      // Mask email for privacy: u****@gmail.com
      const masked = data[0].referrer_email.replace(/^(.).*(@.*)$/, '$1***$2');
      setReferrerEmail(masked);
      setReferrerId(data[0].referrer_id);
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
      setReferrerId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords match nahi karte');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye');
      return;
    }

    // If referral code provided but invalid -> error
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

    // 2. If referral code was valid, create referral record
    if (signUpData.user && referralValid === true && referrerId) {
      try {
        // Update new user's profile with referred_by
        await supabase
          .from('profiles')
          .update({ referred_by: referrerId })
          .eq('id', signUpData.user.id);

        // Create referral record
        await supabase.from('referrals').insert({
          referrer_id: referrerId,
          referee_id: signUpData.user.id,
          referral_code: formData.referralCode,
          status: 'pending',
        });
      } catch (err) {
        console.error('Referral linking failed:', err);
      }
    }

    if (signUpData.user) {
      const refMsg = formData.referralCode && referralValid 
        ? ` First payment pe discount milega.` 
        : '';
      setSuccess(`✅ Account ban gaya!${refMsg} Email check karein verification ke liye.`);
      setTimeout(() => router.push('/login'), 3000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <div className="text-2xl font-bold text-emerald-700">📊 Expenditure Generator</div>
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-600 mb-6">Free trial - koi credit card nahi chahiye</p>

        {/* Referral bonus banner (if code valid) */}
        {referralValid === true && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">🎁</span>
              <div className="text-sm">
                <div className="font-bold text-emerald-900">
                  Referral Active!
                </div>
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

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4 text-sm">
            {success}
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded disabled:opacity-50"
          >
            {loading ? 'Account ban raha hai...' : 'Sign Up'}
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
