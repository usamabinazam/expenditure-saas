import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get current subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // ============================================================
  // REFERRAL STATUS CHECK
  // ============================================================
  
  // 1. Get user's profile (referred_by)
  const { data: profile } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single();

  let isReferred = false;
  let hasUsedDiscount = false;
  let referrerEmail = '';

  if (profile?.referred_by) {
    isReferred = true;

    // 2. Get referral record to check discount status
    const { data: referral } = await supabase
      .from('referrals')
      .select('discount_applied, status')
      .eq('referee_id', user.id)
      .single();

    // Discount already used if discount_applied > 0 OR status is 'paid'/'rewarded'
    if (referral && (referral.discount_applied > 0 || ['paid', 'rewarded'].includes(referral.status))) {
      hasUsedDiscount = true;
    }

    // 3. Get referrer's email (masked)
    const { data: referrer } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', profile.referred_by)
      .single();

    if (referrer?.email) {
      // Mask: u****@gmail.com
      referrerEmail = referrer.email.replace(/^(.).*(@.*)$/, '$1***$2');
    }
  }

  return (
    <PricingClient
      userEmail={user.email}
      userId={user.id}
      currentSubscription={subscription}
      isReferred={isReferred}
      hasUsedDiscount={hasUsedDiscount}
      referrerEmail={referrerEmail}
    />
  );
}
