import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ViewStatementClient from './ViewStatementClient';

export default async function ViewStatementPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!school) redirect('/setup');

  const { data: statement } = await supabase
    .from('statements')
    .select('*')
    .eq('id', params.id)
    .eq('school_id', school.id)
    .single();

  if (!statement) notFound();

  return (
    <ViewStatementClient
      userEmail={user.email}
      school={school}
      statement={statement}
    />
  );
}
