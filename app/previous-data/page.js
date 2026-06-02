import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionInfo } from '@/lib/subscription';
import PreviousDataClient from './PreviousDataClient';

export const dynamic = 'force-dynamic';

export default async function PreviousDataPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Subscription check
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const subInfo = getSubscriptionInfo(subscription);
  if (subInfo.isExpired) {
    redirect('/pricing?expired=true');
  }

  // School check
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!school) redirect('/setup');

  // Get heads with previous_expenditure
  const { data: heads } = await supabase
    .from('budget_heads')
    .select('*')
    .eq('school_id', school.id)
    .order('section')
    .order('display_order');

  return (
    <PreviousDataClient
      userEmail={user.email}
      school={school}
      heads={heads || []}
    />
  );
}
