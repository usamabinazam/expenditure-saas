'use client';

import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import NewStatementClient from './NewStatementClient';

export default function NewStatementPage() {
  const { ready, school, heads, statements } = useLocalData();
  if (!ready) return <PageLoading />;

  return <NewStatementClient school={school} heads={heads} statements={statements} />;
}
