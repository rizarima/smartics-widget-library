import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import { hasSupabase } from '@/lib/supabase-server';

export const metadata = { title: 'Login' };

export default function Login({ searchParams }) {
  const next = (searchParams.next || '/').startsWith('/') ? searchParams.next || '/' : '/';
  return (
    <div className="auth card">
      <h1>Login</h1>
      <p className="muted">Masuk sebagai member SmartICS atau partner untuk mengunduh widget.</p>
      <AuthForm mode="login" next={next} enabled={hasSupabase} />
      <p className="small muted" style={{ marginBottom: 0 }}>Belum punya akun? <Link href={`/daftar-partner?next=${encodeURIComponent(next)}`}>Daftar sebagai partner SmartICS</Link>. Akun member dibuat oleh tim SmartICS.</p>
    </div>
  );
}
