'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navigation({ userEmail }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <Link href="/dashboard" className="text-xl font-bold">
          📊 Expenditure Generator
        </Link>
        <div className="flex gap-3 text-sm items-center flex-wrap">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/new-statement" className="hover:underline">New Statement</Link>
          <Link href="/heads" className="hover:underline">Manage Heads</Link>
          {/* NEW: Previous Data link */}
          <Link href="/previous-data" className="hover:underline">Previous Data</Link>
          <Link 
            href="/referrals" 
            className="bg-yellow-400 hover:bg-yellow-300 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          >
            🎁 Earn 2 Months Free
          </Link>
          <Link href="/setup" className="hover:underline">Profile</Link>
            <Link href="/ac-bills"className="hover:underline">AC Bills</Link>
          <span className="text-emerald-200 text-xs">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 rounded text-xs"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
