'use client';

import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import PreviousDataClient from './PreviousDataClient';

export default function PreviousDataPage() {
  const { ready, heads } = useLocalData();
  if (!ready) return <PageLoading />;

  return <PreviousDataClient heads={heads} />;
}
