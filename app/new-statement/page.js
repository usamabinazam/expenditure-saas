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
  // SUBSCRIPTION CHECK - Block expired users
  // ============================================================
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const subInfo = getSubscriptionInfo(subscription);

  // If trial/subscription is expired -> redirect to pricing
  if (subInfo.isExpired) {
    redirect('/pricing?expired=true');
  }
  // ============================================================

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (!school) redirect('/setup');

  const { data: heads } = await supabase
    .from('budget_heads')
    .select('*')
    .eq('school_id', school.id)
    .order('section')
    .order('display_order');

  const { data: statements } = await supabase
    .from('statements')
    .select('*')
    .eq('school_id', school.id)
    .order('year', { ascending: false })
    .order('month_num', { ascending: false });

  return (
    <NewStatementClient
      userEmail={user.email}
      school={school}
      heads={heads || []}
      statements={statements || []}
    />
  );
}
