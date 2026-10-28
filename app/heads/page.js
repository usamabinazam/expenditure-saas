'use client';

import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import HeadsClient from './HeadsClient';

export default function HeadsPage() {
  const { ready, heads } = useLocalData();
  if (!ready) return <PageLoading />;

  return <HeadsClient heads={heads} />;
}
