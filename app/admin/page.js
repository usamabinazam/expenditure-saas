'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { createClient } from '@/lib/supabase/client';
import { PLANS, calculateNewExpiry, formatDate } from '@/lib/subscription';

export default function AdminClient({ userEmail, pendingRequests: initialRequests, allSubscriptions: initialSubs }) {
  const router = useRouter();
  const supabase = createClient();

  const [requests, setRequests] = useState(initialRequests);
  const [subscriptions, setSubscriptions] = useState(initialSubs);
  const [processing, setProcessing] = useState(null);
  const [tab, setTab] = useState('pending');

  // APPROVE PAYMENT
  const handleApprove = async (request) => {
    if (!confirm(`Approve ${request.profiles?.email} ka ${request.plan} plan?`)) return;

    setProcessing(request.id);

    const plan = PLANS[request.plan];
    if (!plan) {
      alert('Invalid plan');
      setProcessing(null);
      return;
    }

    // Get current subscription to extend if needed
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', request.user_id)
      .single();

    const newExpiry = calculateNewExpiry(currentSub?.expires_at, plan.duration_days);

    // Update subscription to active
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

    // Mark request as approved
    await supabase
      .from('payment_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // Update local state
    setRequests(requests.filter((r) => r.id !== request.id));
    setProcessing(null);
    alert(`✅ ${request.profiles?.email} activated! Expires: ${formatDate(newExpiry)}`);
  };

  // REJECT PAYMENT
  const handleReject = async (request) => {
    const reason = prompt('Reject karne ki wajah? (optional)');
    if (reason === null) return; // cancelled

    setProcessing(request.id);

    await supabase
      .from('payment_requests')
      .update({
        status: 'rejected',
        notes: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    // Reset subscription back to expired
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', request.user_id);

    setRequests(requests.filter((r) => r.id !== request.id));
    setProcessing(null);
    alert('Payment rejected');
  };

  // MANUAL EXTEND (give free days)
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🎯 Admin Panel</h1>

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
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-800">{req.profiles?.email || 'Unknown'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Plan: <strong>{PLANS[req.plan]?.name || req.plan}</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        Amount: <strong>Rs. {req.amount?.toLocaleString()}</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        Transaction ID: <span className="font-mono">{req.transaction_id}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(req.created_at)}
                      </div>
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
