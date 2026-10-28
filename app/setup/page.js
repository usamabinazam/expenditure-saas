'use client';

import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import SetupClient from './SetupClient';

export default function SetupPage() {
  const { ready, school } = useLocalData();
  if (!ready) return <PageLoading />;

  return <SetupClient school={school} />;
}
