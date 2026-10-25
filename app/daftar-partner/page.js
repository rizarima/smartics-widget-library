import Link from 'next/link';
import Icon from '@/components/Icon';
import AuthForm from '@/components/AuthForm';
import { hasSupabase } from '@/lib/supabase-server';

export const metadata = { title: 'Daftar Partner' };

export default function Register({ searchParams }) {
  const next = (searchParams.next || '/widgets').startsWith('/') ? searchParams.next || '/widgets' : '/widgets';
  return (
    <div className="auth"><div className="card">
      <div className="auth-icon"><Icon name="person" size={26} /></div><h1>Daftar Partner SmartICS</h1>
      <p className="muted">Setelah mendaftar, admin akan meninjau akun Anda. Begitu disetujui, Anda menerima WhatsApp dan bisa mengunduh semua widget.</p>
      <AuthForm mode="register" next={next} enabled={hasSupabase} />
      <p className="small muted" style={{ marginBottom: 0 }}>Sudah punya akun? <Link href={`/login?next=${encodeURIComponent(next)}`}>Login</Link></p>
    </div></div>
  );
}
