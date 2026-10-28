'use client';

// Home page = Dashboard (koi login nahi)
import { useLocalData } from '@/lib/store';
import PageLoading from '@/components/PageLoading';
import DashboardClient from './dashboard/DashboardClient';

export default function Home() {
  const { ready, school, statements } = useLocalData();
  if (!ready) return <PageLoading />;

  return <DashboardClient school={school} statements={statements} />;
}
