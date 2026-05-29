import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionInfo } from '@/lib/subscription';
import NewStatementClient from './NewStatementClient';

export const dynamic = 'force-dynamic';

export default async function NewStatementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ============================================================
  // FETCH SUBSCRIPTION
  // ============================================================
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const subInfo = getSubscriptionInfo(subscription);

  // DEBUG INFO - show on screen
  return (
    <div style={{ padding: '30px', fontFamily: 'monospace', fontSize: '13px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>🔍 NEW STATEMENT DEBUG</h1>

      <div style={{ background: '#dbeafe', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>👤 User</h3>
        <div>ID: {user.id}</div>
        <div>Email: {user.email}</div>
      </div>

      <div style={{ background: '#fef3c7', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>💾 Subscription (raw from database)</h3>
        <div>Error: {subError?.message || 'none'}</div>
        <pre>{JSON.stringify(subscription, null, 2)}</pre>
      </div>

      <div style={{ background: '#fce7f3', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>⚙️ getSubscriptionInfo() Result</h3>
        <pre>{JSON.stringify(subInfo, null, 2)}</pre>
      </div>

      <div style={{ background: '#d1fae5', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>🎯 Decision</h3>
        <div>isExpired: <strong>{String(subInfo.isExpired)}</strong></div>
        <div>isActive: <strong>{String(subInfo.isActive)}</strong></div>
        <div>isTrial: <strong>{String(subInfo.isTrial)}</strong></div>
        <div>status: <strong>{subInfo.status}</strong></div>
        <div>daysLeft: <strong>{subInfo.daysLeft}</strong></div>
        <div style={{ marginTop: '10px', padding: '10px', background: subInfo.isExpired ? '#fee2e2' : '#dcfce7' }}>
          {subInfo.isExpired ? '❌ WOULD REDIRECT TO /pricing' : '✅ WOULD ALLOW ACCESS'}
        </div>
      </div>

      <div style={{ background: '#e0e7ff', padding: '15px', borderRadius: '8px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>🕐 Time Comparison</h3>
        <div>Now: {new Date().toISOString()}</div>
        <div>trial_ends_at: {subscription?.trial_ends_at}</div>
        <div>expires_at: {subscription?.expires_at}</div>
        <div>Trial expired? {subscription?.trial_ends_at ? String(new Date(subscription.trial_ends_at) < new Date()) : 'N/A'}</div>
        <div>Subscription expired? {subscription?.expires_at ? String(new Date(subscription.expires_at) < new Date()) : 'N/A'}</div>
      </div>

      <p style={{ marginTop: '20px' }}>
        <a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>← Back to Dashboard</a>
      </p>
    </div>
  );
}
