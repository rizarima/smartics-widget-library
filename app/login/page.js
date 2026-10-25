import Link from 'next/link';
import Icon from '@/components/Icon';
import AuthForm from '@/components/AuthForm';
import { hasSupabase } from '@/lib/supabase-server';
import { getT } from '@/lib/lang';

export function generateMetadata() { return { title: getT().t('nav.login') }; }

export default function Login({ searchParams }) {
  const { t } = getT();
  const next = (searchParams.next || '/').startsWith('/') ? searchParams.next || '/' : '/';
  return (
    <div className="auth"><div className="card">
      <div className="auth-icon"><Icon name="login" size={26} /></div><h1>{t('nav.login')}</h1>
      <p className="muted">{t('auth.loginLead')}</p>
      <AuthForm mode="login" next={next} enabled={hasSupabase} />
      <p className="small muted" style={{ marginBottom: 0 }}>{t('auth.noAccount')} <Link href={`/daftar-partner?next=${encodeURIComponent(next)}`}>{t('auth.registerLink')}</Link>. {t('auth.memberNote')}</p>
    </div></div>
  );
}
