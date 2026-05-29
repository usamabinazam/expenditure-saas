import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReferralsClient from './ReferralsClient';

export const dynamic = 'force-dynamic'; 

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user's profile (referral code)
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, email')
    .eq('id', user.id)
    .single();

  // Get all referrals where current user is referrer
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  // Enrich with referee emails
  const enrichedReferrals = await Promise.all(
    (referrals || []).map(async (ref) => {
      const { data: referee } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', ref.referee_id)
        .single();
      
      return {
        ...ref,
        referee_email: referee?.email || 'Unknown',
      };
    })
  );

  // Calculate stats
  const stats = {
    total: enrichedReferrals.length,
    pending: enrichedReferrals.filter(r => r.status === 'pending').length,
    paid: enrichedReferrals.filter(r => r.status === 'paid' || r.status === 'rewarded').length,
    rewarded: enrichedReferrals.filter(r => r.status === 'rewarded').length,
  };

  // Total days earned (60 days per rewarded referral)
  const daysEarned = stats.rewarded * 60;

  return (
    <ReferralsClient
      userEmail={user.email}
      referralCode={profile?.referral_code || ''}
      referrals={enrichedReferrals}
      stats={stats}
      daysEarned={daysEarned}
    />
  );
}
