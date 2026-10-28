'use server';

import { createClient } from '@/lib/supabase/server';

// ============================================================
// SAVE STATEMENT - server pe chalta hai (Vercel → Supabase)
// User ka browser seedha Supabase se baat nahi karta, is liye
// user ke internet ka Supabase connection masla nahi banta.
// ============================================================
export async function saveStatement({ year, month_num, month_name, data }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Login session khatam ho gaya. Dobara login karein.' };
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!school) {
    return { error: 'School profile nahi mila. Pehle Profile set karein.' };
  }

  // Same month+year pehle se hai → update, warna naya
  const { data: existing } = await supabase
    .from('statements')
    .select('id')
    .eq('school_id', school.id)
    .eq('year', year)
    .eq('month_num', month_num)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from('statements')
        .update({ data })
        .eq('id', existing.id)
        .select('id')
        .single()
    : await supabase
        .from('statements')
        .insert({ school_id: school.id, year, month_num, month_name, data })
        .select('id')
        .single();

  if (result.error) {
    return { error: result.error.message };
  }

  return { id: result.data.id };
}
