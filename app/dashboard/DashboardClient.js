'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { createClient } from '@/lib/supabase/client';
import { formatNumber } from '@/lib/utils';

export default function DashboardClient({ userEmail, school, statements: initialStatements, subscription }) {
  const router = useRouter();
  const [statements, setStatements] = useState(initialStatements);
  const [showReferralPromo, setShowReferralPromo] = useState(true);

  // Check if user dismissed the promo (localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem('referral_promo_dismissed');
    if (dismissed) {
      // Show again after 7 days
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setShowReferralPromo(false);
      }
    }
  }, []);

  const handleDismissPromo = () => {
    localStorage.setItem('referral_promo_dismissed', new Date().toISOString());
    setShowReferralPromo(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this statement?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('statements').delete().eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setStatements(statements.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Subscription banner - trial/expiry status */}
        <SubscriptionBanner subscription={subscription} />

        {/* REFERRAL PROMO BANNER (dismissible) */}
        {showReferralPromo && (
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded-lg p-5 mb-6 shadow-lg overflow-hidden">
            {/* Dismiss button */}
            <button
              onClick={handleDismissPromo}
              className="absolute top-2 right-2 text-white/70 hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
              title="Dismiss (7 din ke liye)"
            >
              ×
            </button>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="text-4xl">🎁</div>
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">
                    Earn 2 Months Free!
                  </div>
                  <div className="text-emerald-50 text-sm mt-1">
                    Apne dosto/colleagues ko refer karein. Har paid signup pe aapko <strong>60 din free</strong> subscription milegi. Unhe bhi discount milega!
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/referrals"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-5 py-2 rounded-lg text-sm shadow-md whitespace-nowrap"
                >
                  📤 Share & Earn
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* School info card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{school.name}</h1>
              <p className="text-gray-600 mt-1">
                {school.district} • DDO: {school.ddo_code}
              </p>
            </div>
            <Link href="/setup" className="text-sm text-emerald-700 hover:underline">
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/new-statement"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">📄</div>
            <div className="font-semibold">New Monthly Statement</div>
            <div className="text-sm opacity-90 mt-1">Create this month's expenditure</div>
          </Link>
          <Link
            href="/heads"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold">Manage Heads</div>
            <div className="text-sm opacity-90 mt-1">Edit budget categories</div>
          </Link>
          <Link
            href="/setup"
            className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg p-6 text-center"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold">School Settings</div>
            <div className="text-sm opacity-90 mt-1">Update school information</div>
          </Link>
        </div>

        {/* Statements history */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">📁 Statements History</h2>
            <p className="text-sm text-gray-600 mt-1">Pichle generated statements</p>
          </div>

          {statements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>Abhi tak koi statement nahi banaya.</p>
              <Link
                href="/new-statement"
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Pehla statement banayein
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {statements.map((s) => (
                <div
                  key={s.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="font-semibold text-gray-800">
                      {s.month_name} {s.year}
                    </div>
                    <div className="text-sm text-gray-600">
                      Grand Total:{' '}
                      <span className="font-medium">
                        Rs. {formatNumber(s.data?.grand_total?.total || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/statement/${s.id}`}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-gray-500 text-sm py-6 mt-12">
        Built for KPK Government Schools 🇵🇰
      </footer>
    </div>
  );
}
