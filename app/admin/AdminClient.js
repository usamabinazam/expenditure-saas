'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { PLANS, calculateNewExpiry, formatDate } from '@/lib/subscription';

// Referral reward: 60 days bonus to referrer on paid approval
const REFERRAL_BONUS_DAYS = 60;

export default function AdminClient({ userEmail, pendingRequests: initialRequests, allSubscriptions: initialSubs }) {
  const router = useRouter();
  const supabase = createClient();

  const [requests, setRequests] = useState(initialRequests);
  const [subscriptions, setSubscriptions] = useState(initialSubs);
  const [processing, setProcessing] = useState(null);
  const [tab, setTab] = useState('pending');

  // APPROVE PAYMENT (with referral reward)
  const handleApprove = async (request) => {
    const bonusMsg = request.will_give_bonus 
      ? `\n\n🎁 ${request.referrer_email} ko ${REFERRAL_BONUS_DAYS} din free subscription bhi milegi (referral bonus).`
      : '';
    
    if (!confirm(`Approve ${request.profiles?.email} ka ${request.plan} plan?${bonusMsg}`)) return;

    setProcessing(request.id);

    const plan = PLANS[request.plan];
    if (!plan) {
      alert('Invalid plan');
      setProcessing(null);
      return;
    }

    // ============================================================
    // 1. ACTIVATE REFEREE'S SUBSCRIPTION (existing logic)
    // ============================================================
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', request.user_id)
      .single();

    const newExpiry = calculateNewExpiry(currentSub?.expires_at, plan.duration_days);

    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        plan: request.plan,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: newExpiry,
        amount_paid: request.amount,
        payment_method: 'easypaisa',
        payment_reference: request.transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', request.user_id);

    if (subError) {
      alert('Error: ' + subError.message);
      setProcessing(null);
      return;
    }

    // Mark payment as approved
    await supabase
      .from('payment_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // ============================================================
    // 2. REFERRAL REWARD - Give 60 days to referrer
    // ============================================================
    let referralBonusMsg = '';

    if (request.will_give_bonus && request.profiles?.referred_by) {
      try {
        const referrerId = request.profiles.referred_by;

        // Get referrer's current subscription
        const { data: referrerSub } = await supabase
          .from('subscriptions')
          .select('expires_at, trial_ends_at, status')
          .eq('user_id', referrerId)
          .single();

        // Calculate new expiry for referrer
        // If they have active subscription, extend from current expiry
        // If they're on trial or expired, start from now
        let baseDate = null;
        if (referrerSub?.status === 'active' && referrerSub?.expires_at) {
          baseDate = referrerSub.expires_at;
        }
        
        const referrerNewExpiry = calculateNewExpiry(baseDate, REFERRAL_BONUS_DAYS);

        // Update referrer's subscription
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            expires_at: referrerNewExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', referrerId);

        // Mark referral as rewarded
        await supabase
          .from('referrals')
          .update({
            status: 'rewarded',
            referee_plan: request.plan,
            reward_given_at: new Date().toISOString(),
          })
          .eq('referee_id', request.user_id);

        referralBonusMsg = `\n🎁 Referral bonus given to ${request.referrer_email}!\nTheir subscription now expires: ${formatDate(referrerNewExpiry)}`;
      } catch (err) {
        console.error('Referral bonus failed:', err);
        referralBonusMsg = `\n⚠️ Referral bonus could not be applied (but payment approved): ${err.message}`;
      }
    }

    setRequests(requests.filter((r) => r.id !== request.id));
    setProcessing(null);
    alert(`✅ ${request.profiles?.email} activated! Expires: ${formatDate(newExpiry)}${referralBonusMsg}`);

    router.refresh();
  };

  // REJECT PAYMENT
  const handleReject = async (request) => {
    const reason = prompt('Reject karne ki wajah? (optional)');
    if (reason === null) return;

    setProcessing(request.id);

    await supabase
      .from('payment_requests')
      .update({
        status: 'rejected',
        notes: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    await supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', request.user_id);

    setRequests(requests.filter((r) => r.id !== request.id));
    setProcessing(null);
    alert('Payment rejected');

    router.refresh();
  };

  // MANUAL EXTEND
  const handleManualExtend = async (sub) => {
    const days = prompt('Kitne din add karne hain?', '60');
    if (!days || isNaN(days)) return;

    setProcessing(sub.user_id);

    const newExpiry = calculateNewExpiry(sub.expires_at, parseInt(days));

    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', sub.user_id);

    setSubscriptions(
      subscriptions.map((s) =>
        s.user_id === sub.user_id
          ? { ...s, status: 'active', expires_at: newExpiry }
          : s
      )
    );
    setProcessing(null);
    alert(`✅ ${days} din add ho gaye! New expiry: ${formatDate(newExpiry)}`);

    router.refresh();
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🎯 Admin Panel</h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              tab === 'pending' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            ⏳ Pending Payments ({requests.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              tab === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            👥 All Users ({subscriptions.length})
          </button>
        </div>

        {/* PENDING PAYMENTS */}
        {tab === 'pending' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Koi pending payment nahi 🎉
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800">{req.profiles?.email || 'Unknown'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Plan: <strong>{PLANS[req.plan]?.name || req.plan}</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        Amount: <strong>Rs. {req.amount?.toLocaleString()}</strong>
                        {req.notes && (
                          <span className="text-xs text-gray-500 ml-2">({req.notes})</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Transaction ID: <span className="font-mono">{req.transaction_id}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(req.created_at)}
                      </div>

                      {/* REFERRAL BONUS INFO */}
                      {req.will_give_bonus && req.referrer_email && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span>🎁</span>
                            <span className="text-emerald-800">
                              <strong>Referral Active:</strong> Approving will give{' '}
                              <strong>{req.referrer_email}</strong> a{' '}
                              <strong>{REFERRAL_BONUS_DAYS}-day bonus</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(req)}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {processing === req.id ? '...' : '✅ Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ALL USERS */}
        {tab === 'all' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Expires</th>
                  <th className="text-center p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map((sub) => (
                  <tr key={sub.user_id} className="hover:bg-gray-50">
                    <td className="p-3">{sub.profiles?.email || '-'}</td>
                    <td className="p-3">{PLANS[sub.plan]?.name || sub.plan}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sub.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        sub.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                        sub.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3">{formatDate(sub.expires_at || sub.trial_ends_at)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleManualExtend(sub)}
                        disabled={processing === sub.user_id}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium disabled:opacity-50"
                      >
                        + Days
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
