import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if school is set up
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (!school) redirect('/setup');

  // Get statements
  const { data: statements } = await supabase
    .from('statements')
    .select('*')
    .eq('school_id', school.id)
    .order('year', { ascending: false })
    .order('month_num', { ascending: false });

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <DashboardClient
      userEmail={user.email}
      school={school}
      statements={statements || []}
      subscription={subscription}
    />
  );
}
