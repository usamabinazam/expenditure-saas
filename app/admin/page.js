import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

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
    redirect('/dashboard');
  }

  // Get pending payment requests with user emails
  const { data: pendingRequests } = await supabase
    .from('payment_requests')
    .select('*, profiles(email, referred_by)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // For each pending request, check if user is referred (for showing bonus info)
  const enrichedRequests = await Promise.all(
    (pendingRequests || []).map(async (req) => {
      if (!req.profiles?.referred_by) {
        return { ...req, referrer_email: null, will_give_bonus: false };
      }

      // Get referrer email
      const { data: referrer } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', req.profiles.referred_by)
        .single();

      // Check if referral reward already given (status != 'rewarded')
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('status')
        .eq('referee_id', req.user_id)
        .maybeSingle();

      const willGiveBonus = referralRecord && referralRecord.status !== 'rewarded';

      return {
        ...req,
        referrer_email: referrer?.email || null,
        will_give_bonus: willGiveBonus,
      };
    })
  );

  // Get all subscriptions with emails
  const { data: allSubscriptions } = await supabase
    .from('subscriptions')
    .select('*, profiles(email)')
    .order('updated_at', { ascending: false });

  return (
    <AdminClient
      userEmail={user.email}
      pendingRequests={enrichedRequests || []}
      allSubscriptions={allSubscriptions || []}
    />
  );
}
