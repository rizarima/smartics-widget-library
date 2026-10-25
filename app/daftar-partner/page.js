import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { hasSupabase } from '@/lib/supabase-server';

export const metadata = { title: 'Daftar Partner' };

export default function Register({ searchParams }) {
  const next = (searchParams.next || '/widgets').startsWith('/') ? searchParams.next || '/widgets' : '/widgets';
  return (
    <div className="auth card">
      <h1>Daftar Partner SmartICS</h1>
      <p className="muted">Partner bisa langsung mengunduh semua widget setelah mendaftar.</p>
      <AuthForm mode="register" next={next} enabled={hasSupabase} />
      <p className="small muted" style={{ marginBottom: 0 }}>Sudah punya akun? <Link href={`/login?next=${encodeURIComponent(next)}`}>Login</Link></p>
    </div>
  );
}
