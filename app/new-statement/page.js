import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewStatementClient from './NewStatementClient';

export const dynamic = 'force-dynamic';

export default async function NewStatementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // School check
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (!school) redirect('/setup');

  // Get heads
  const { data: heads } = await supabase
    .from('budget_heads')
    .select('*')
    .eq('school_id', school.id)
    .order('section')
    .order('display_order');

  // Get statements
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
