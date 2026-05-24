import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewStatementClient from './NewStatementClient';

export default async function NewStatementPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

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
