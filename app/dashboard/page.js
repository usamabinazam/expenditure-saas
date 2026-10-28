import { redirect } from 'next/navigation';

// Purane links ke liye - Dashboard ab home page pe hai
export default function DashboardPage() {
  redirect('/');
}
