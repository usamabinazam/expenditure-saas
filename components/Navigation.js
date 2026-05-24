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
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          📊 Expenditure Generator
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/new-statement" className="hover:underline">New Statement</Link>
          <Link href="/heads" className="hover:underline">Manage Heads</Link>
          <Link href="/setup" className="hover:underline">Profile</Link>
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
