'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSchool, getStatement } from '@/lib/store';
import Navigation from '@/components/Navigation';
import PageLoading from '@/components/PageLoading';
import ViewStatementClient from './ViewStatementClient';

export default function ViewStatementPage() {
  const { id } = useParams();
  const [state, setState] = useState({ ready: false, school: null, statement: null });

  useEffect(() => {
    setState({ ready: true, school: getSchool(), statement: getStatement(id) });
  }, [id]);

  if (!state.ready) return <PageLoading />;

  if (!state.statement) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-700 mb-4">Yeh statement is browser mein nahi mila.</p>
          <Link href="/new-statement" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
            Naya statement banayein
          </Link>
        </main>
      </div>
    );
  }

  return <ViewStatementClient school={state.school || {}} statement={state.statement} />;
}
