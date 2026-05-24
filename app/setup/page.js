import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetupClient from './SetupClient';

export default async function SetupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return <SetupClient userEmail={user.email} school={school} userId={user.id} />;
}
