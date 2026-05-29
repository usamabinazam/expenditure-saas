import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  // DEBUG: Check what's happening
  const debug = {
    userId: user.id,
    userEmail: user.email,
    profile: profile,
    profileError: profileError?.message,
  };

  if (!profile?.is_admin) {
    return (
      <div style={{ padding: '40px', fontFamily: 'monospace' }}>
        <h1>🔍 DEBUG - Not Admin</h1>
        <pre>{JSON.stringify(debug, null, 2)}</pre>
        <p>Profile mein is_admin = {String(profile?.is_admin)}</p>
        <p>Profile Error: {profileError?.message || 'none'}</p>
        <a href="/dashboard">← Dashboard</a>
      </div>
    );
  }

  // Get pending payment requests
  const { data: pendingRequests, error: reqError } = await supabase
    .from('payment_requests')
    .select('*, profiles(email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get all subscriptions
  const { data: allSubscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*, profiles(email)')
    .order('updated_at', { ascending: false });

  // Also try WITHOUT join to see if join is the issue
  const { data: rawRequests, error: rawError } = await supabase
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false });

  // DEBUG: Show what we got
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '20px' }}>🔍 ADMIN DEBUG INFO</h1>
      
      <div style={{ background: '#e0f2fe', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3>✅ User Info</h3>
        <p>User ID: {user.id}</p>
        <p>Email: {user.email}</p>
        <p>Is Admin: {String(profile?.is_admin)}</p>
      </div>

      <div style={{ background: '#fef3c7', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3>📋 Payment Requests (WITH profiles join)</h3>
        <p>Count: {pendingRequests?.length || 0}</p>
        <p>Error: {reqError?.message || 'none'}</p>
        <pre>{JSON.stringify(pendingRequests, null, 2)}</pre>
      </div>

      <div style={{ background: '#fce7f3', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3>📋 Payment Requests (WITHOUT join - raw)</h3>
        <p>Count: {rawRequests?.length || 0}</p>
        <p>Error: {rawError?.message || 'none'}</p>
        <pre>{JSON.stringify(rawRequests, null, 2)}</pre>
      </div>

      <div style={{ background: '#d1fae5', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
        <h3>📋 All Subscriptions</h3>
        <p>Count: {allSubscriptions?.length || 0}</p>
        <p>Error: {subError?.message || 'none'}</p>
        <pre>{JSON.stringify(allSubscriptions, null, 2)}</pre>
      </div>

      <hr style={{ margin: '30px 0' }} />
      
      <h2 style={{ fontSize: '16px' }}>Original Admin Panel:</h2>
      <AdminClient
        userEmail={user.email}
        pendingRequests={pendingRequests || []}
        allSubscriptions={allSubscriptions || []}
      />
    </div>
  );
}
