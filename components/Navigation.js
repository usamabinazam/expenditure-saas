'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-emerald-700 text-white shadow-md acb-no-print">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <Link href="/" className="text-xl font-bold">
          📊 Expenditure Generator
        </Link>
        <div className="flex gap-3 text-sm items-center flex-wrap">
          <Link href="/" className="hover:underline">Dashboard</Link>
          <Link href="/new-statement" className="hover:underline">New Statement</Link>
          <Link href="/heads" className="hover:underline">Manage Heads</Link>
          <Link href="/previous-data" className="hover:underline">Previous Data</Link>
          <Link href="/setup" className="hover:underline">School Profile</Link>
          <Link href="/ac-bills" className="hover:underline">AC Bills</Link>
        </div>
      </div>
    </nav>
  );
}
