import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PricingClient from './PricingClient';

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

  return (
    <PricingClient
      userEmail={user.email}
      userId={user.id}
      currentSubscription={subscription}
    />
  );
}
