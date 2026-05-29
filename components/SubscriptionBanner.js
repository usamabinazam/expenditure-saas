'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSubscriptionInfo, formatDate } from '@/lib/subscription';

export default function SubscriptionBanner({ subscription }) {
  const router = useRouter();
  const info = getSubscriptionInfo(subscription);

  const handleRefresh = () => {
    router.refresh();
  };

  // Format the expiry date nicely
  const trialEndDate = subscription?.trial_ends_at ? formatDate(subscription.trial_ends_at) : '';
  const expiryDate = subscription?.expires_at ? formatDate(subscription.expires_at) : '';

  // ============================================================
  // ACTIVE (with plenty of time - 7+ din)
  // ============================================================
  if (info.status === 'active' && info.daysLeft > 7) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-emerald-800">
            ✅ <strong>Active Subscription</strong>
            <div className="text-xs text-emerald-700 mt-1">
              📅 Expiry: <strong>{expiryDate}</strong> • {info.daysLeft} din baaki
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-emerald-700 hover:underline"
          >
            🔄 Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // TRIAL (active)
  // ============================================================
  if (info.isTrial) {
    return (
      <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎁</span>
              <span className="font-bold text-blue-900">Free Trial Active</span>
            </div>
            <div className="text-sm text-blue-800 ml-9">
              Aap abhi <strong>trial use kar rahe hain</strong> jo <strong>{trialEndDate}</strong> ko expire hoga.
            </div>
            <div className="text-sm text-blue-900 ml-9 mt-1 font-medium">
              ⏰ Sirf <strong>{info.daysLeft} din baqi</strong> hain — abhi upgrade karein!
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Link
              href="/pricing"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-lg whitespace-nowrap shadow-md"
            >
              ⚡ Upgrade Now
            </Link>
            <button
              onClick={handleRefresh}
              className="text-xs text-blue-700 hover:underline"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // PENDING (payment submitted, waiting for admin)
  // ============================================================
  if (info.status === 'pending') {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⏳</span>
              <span className="font-bold text-yellow-900">Payment Verify Ho Rahi Hai</span>
            </div>
            <div className="text-sm text-yellow-800 ml-9">
              Admin 1-2 ghante mein activate karega. Ek baar status check karte rahein.
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold px-4 py-2 rounded-lg whitespace-nowrap"
          >
            🔄 Status Check
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ACTIVE (expiring soon - ≤7 din)
  // ============================================================
  if (info.status === 'active' && info.daysLeft <= 7) {
    return (
      <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⚠️</span>
              <span className="font-bold text-orange-900">Subscription Jald Expire Hoga!</span>
            </div>
            <div className="text-sm text-orange-800 ml-9">
              Aapka plan <strong>{expiryDate}</strong> ko expire hoga.
            </div>
            <div className="text-sm text-orange-900 ml-9 mt-1 font-medium">
              ⏰ Sirf <strong>{info.daysLeft} din baqi</strong> — abhi renew karein!
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Link
              href="/pricing"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-lg whitespace-nowrap shadow-md"
            >
              🔄 Renew Now
            </Link>
            <button
              onClick={handleRefresh}
              className="text-xs text-orange-700 hover:underline"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // EXPIRED
  // ============================================================
  if (info.isExpired) {
    return (
      <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔒</span>
              <span className="font-bold text-red-900">Subscription Khatam Ho Gaya</span>
            </div>
            <div className="text-sm text-red-800 ml-9">
              Naye statements banane ke liye renew karein. Purane statements safe hain.
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Link
              href="/pricing"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-lg whitespace-nowrap shadow-md"
            >
              ⚡ Renew Now
            </Link>
            <button
              onClick={handleRefresh}
              className="text-xs text-red-700 hover:underline"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
