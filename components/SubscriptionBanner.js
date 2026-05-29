'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSubscriptionInfo } from '@/lib/subscription';

// Yeh banner dashboard ke top pe dikhega - trial/expiry status
export default function SubscriptionBanner({ subscription }) {
  const router = useRouter();
  const info = getSubscriptionInfo(subscription);

  const handleRefresh = () => {
    router.refresh();
  };

  // Active with plenty of time - small status badge only
  if (info.status === 'active' && info.daysLeft > 7) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex items-center justify-between">
        <div className="text-sm text-emerald-800">
          ✅ <strong>Active Subscription</strong> • {info.daysLeft} din baaki
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs text-emerald-700 hover:underline"
        >
          🔄 Refresh
        </button>
      </div>
    );
  }

  // Trial
  if (info.isTrial) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-blue-800">
          🎁 <strong>Free Trial:</strong> {info.daysLeft} din baaki. Pura access enjoy karein!
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="text-xs text-blue-700 hover:underline px-2"
          >
            🔄
          </button>
          <Link
            href="/pricing"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  // Pending
  if (info.status === 'pending') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-yellow-800">
          ⏳ <strong>Payment verify ho rahi hai.</strong> Admin jald hi activate karega (1-2 hours).
        </div>
        <button
          onClick={handleRefresh}
          className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          🔄 Status Check
        </button>
      </div>
    );
  }

  // Active but expiring soon
  if (info.status === 'active' && info.daysLeft <= 7) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-orange-800">
          ⚠️ <strong>Subscription {info.daysLeft} din mein khatam.</strong> Renew karna na bhoolein!
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="text-xs text-orange-700 hover:underline px-2">
            🔄
          </button>
          <Link
            href="/pricing"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Renew
          </Link>
        </div>
      </div>
    );
  }

  // Expired
  if (info.isExpired) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-red-800">
          🔒 <strong>Subscription khatam ho gaya.</strong> Purane statements dekh sakte hain, naye banane ke liye renew karein.
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="text-xs text-red-700 hover:underline px-2">
            🔄
          </button>
          <Link
            href="/pricing"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Renew Now
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
