'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { formatDate } from '@/lib/subscription';

export default function ReferralsClient({ userEmail, referralCode, referrals, stats, daysEarned }) {
  const router = useRouter();
  const [copied, setCopied] = useState('');

  // Build share URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/signup?ref=${referralCode}`;

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const whatsappText = encodeURIComponent(
    `Salam! Main "Expenditure Generator" use kar raha/rahi hoon — KPK schools ke monthly reconciliation statements 5 minutes mein banata hai (varna 2 ghante lagte hain).\n\n` +
    `Free trial 7 din ke liye hai, aur mere referral code se aap ko discount bhi milega:\n\n` +
    `🔗 ${shareUrl}\n` +
    `Ya signup pe yeh code daalein: *${referralCode}*\n\n` +
    `Try karo - bohot kaam ka tool hai!`
  );

  const whatsappLink = `https://wa.me/?text=${whatsappText}`;

  // Status badge colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'rewarded':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Rewarded', emoji: '🎉' };
      case 'paid':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: '💰 Paid', emoji: '⏳' };
      case 'pending':
      default:
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Pending', emoji: '👤' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🎁 Refer & Earn</h1>
          <p className="text-gray-600 text-sm mt-1">
            Apne dosto ko invite karein - har paid signup pe <strong>2 months FREE</strong>!
          </p>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 rounded-xl p-6 mb-6 text-white shadow-lg">
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-3xl font-bold mb-2">🎁 Earn 2 Months Free</div>
              <div className="text-emerald-50 text-sm mb-4">
                Apne friends/colleagues ko refer karein. Jab woh paid plan lein, aapko automatically <strong>60 din free</strong> mil jayenge!
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3 inline-block">
                <div className="text-xs text-emerald-50 uppercase">Total Earned</div>
                <div className="text-3xl font-bold">{daysEarned} <span className="text-base font-normal">din</span></div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-xs text-emerald-50 uppercase mb-2">Friend Ko Bhi Discount Milega</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Basic Monthly:</span>
                  <span className="font-bold">Rs. 50 off</span>
                </div>
                <div className="flex justify-between">
                  <span>Basic Yearly:</span>
                  <span className="font-bold">Rs. 500 off</span>
                </div>
                <div className="flex justify-between">
                  <span>Multi Monthly:</span>
                  <span className="font-bold">Rs. 100 off</span>
                </div>
                <div className="flex justify-between">
                  <span>Multi Yearly:</span>
                  <span className="font-bold">Rs. 1,000 off</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 uppercase">Total Invites</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-yellow-600 uppercase">Pending</div>
            <div className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-blue-600 uppercase">Paid</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{stats.paid}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-emerald-600 uppercase">Rewarded</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.rewarded}</div>
          </div>
        </div>

        {/* Your Referral Code & Link */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📤 Apna Referral Share Karein</h2>

          {/* Referral Code Box */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Aapka Referral Code:</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border-2 border-emerald-300 rounded-lg px-4 py-3 font-mono text-xl font-bold text-emerald-700 text-center">
                {referralCode || 'Loading...'}
              </div>
              <button
                onClick={() => handleCopy(referralCode, 'code')}
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg whitespace-nowrap"
              >
                {copied === 'code' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Share Link */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Direct Signup Link:</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-700"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => handleCopy(shareUrl, 'link')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg whitespace-nowrap"
              >
                {copied === 'link' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Is link se signup karne wala automatic referred ho jayega</p>
          </div>

          {/* WhatsApp Share Button */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-center"
          >
            📱 WhatsApp Pe Share Karein
          </a>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Pre-written message ke saath WhatsApp khulega
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🤔 Yeh Kaise Kaam Karta Hai?</h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">1</div>
              <div className="text-sm text-gray-700">
                <strong>Share karein</strong> - Apna code ya link friends/colleagues ko bhejein
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">2</div>
              <div className="text-sm text-gray-700">
                <strong>Woh signup karein</strong> - Code daal ke account banayein (7-day trial milega)
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">3</div>
              <div className="text-sm text-gray-700">
                <strong>Woh paid plan lein</strong> - First payment pe unhe discount milega (Rs.50-1000)
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">4</div>
              <div className="text-sm text-gray-700">
                <strong>Aapko 60 din free milein</strong> - Admin approve karte hi automatic credit
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">👥 Aapke Referrals ({stats.total})</h2>
          </div>

          {referrals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🤝</div>
              <div className="font-medium mb-1">Abhi koi referral nahi</div>
              <div className="text-sm">Apna code share karke shuru karein!</div>
            </div>
          ) : (
            <div className="divide-y">
              {referrals.map((ref) => {
                const badge = getStatusBadge(ref.status);
                return (
                  <div key={ref.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{badge.emoji}</div>
                      <div>
                        <div className="font-medium text-gray-800">{ref.referee_email}</div>
                        <div className="text-xs text-gray-500">
                          Signed up: {formatDate(ref.created_at)}
                          {ref.reward_given_at && (
                            <> • Rewarded: {formatDate(ref.reward_given_at)}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ref.status === 'rewarded' && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          +60 din earned
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back to dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Dashboard pe wapas jayein
          </button>
        </div>
      </main>
    </div>
  );
}
