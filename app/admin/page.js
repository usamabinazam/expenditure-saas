import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/dashboard'); // Not an admin
  }

  // Get pending payment requests with user emails
  const { data: pendingRequests } = await supabase
    .from('payment_requests')
    .select('*, profiles(email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get all subscriptions with emails
  const { data: allSubscriptions } = await supabase
    .from('subscriptions')
    .select('*, profiles(email)')
    .order('updated_at', { ascending: false });

  return (
    <AdminClient
      userEmail={user.email}
      pendingRequests={pendingRequests || []}
      allSubscriptions={allSubscriptions || []}
    />
  );
}
