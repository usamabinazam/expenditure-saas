// app/ac-bills/page.js
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionInfo } from '@/lib/subscription';
import ACBillsClient from './ACBillsClient';

export const dynamic = 'force-dynamic';

export default async function ACBillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // SUBSCRIPTION CHECK
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const subInfo = getSubscriptionInfo(subscription);
  if (subInfo.isExpired) {
    redirect('/pricing?expired=true');
  }

  // SCHOOL CHECK
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!school) redirect('/setup');

  return (
    <ACBillsClient
      userEmail={user.email}
      school={school}
    />
  );
}
