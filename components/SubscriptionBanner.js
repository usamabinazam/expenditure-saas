'use client';

import Link from 'next/link';
import { getSubscriptionInfo } from '@/lib/subscription';

// Yeh banner dashboard ke top pe dikhega - trial/expiry status
export default function SubscriptionBanner({ subscription }) {
  const info = getSubscriptionInfo(subscription);

  // Active with plenty of time - no banner needed
  if (info.status === 'active' && info.daysLeft > 7) {
    return null;
  }

  // Trial
  if (info.isTrial) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-blue-800">
          🎁 <strong>Free Trial:</strong> {info.daysLeft} din baaki. Pura access enjoy karein!
        </div>
        <Link
          href="/pricing"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          Upgrade Now
        </Link>
      </div>
    );
  }

  // Pending
  if (info.status === 'pending') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
        ⏳ <strong>Payment verify ho rahi hai.</strong> Admin jald hi activate karega (1-2 hours).
      </div>
    );
  }

  // Active but expiring soon (within 7 days)
  if (info.status === 'active' && info.daysLeft <= 7) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-orange-800">
          ⚠️ <strong>Subscription {info.daysLeft} din mein khatam.</strong> Renew karna na bhoolein!
        </div>
        <Link
          href="/pricing"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          Renew
        </Link>
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
        <Link
          href="/pricing"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
        >
          Renew Now
        </Link>
      </div>
    );
  }

  return null;
}
