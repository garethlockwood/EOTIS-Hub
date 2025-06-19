import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
  return null; // Satisfy React component return type, redirect happens server-side
}
