'use client';

import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import ACBillsClient from './ACBillsClient';

export default function ACBillsPage() {
  const { ready, school } = useLocalData();
  if (!ready) return <PageLoading />;

  return <ACBillsClient school={school} />;
}
