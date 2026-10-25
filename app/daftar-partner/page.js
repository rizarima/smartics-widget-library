import Link from 'next/link';
import Icon from '@/components/Icon';
import AuthForm from '@/components/AuthForm';
import { hasSupabase } from '@/lib/supabase-server';
import { getT } from '@/lib/lang';

export function generateMetadata() { return { title: getT().t('nav.register') }; }

export default function Register({ searchParams }) {
  const { t } = getT();
  const next = (searchParams.next || '/widgets').startsWith('/') ? searchParams.next || '/widgets' : '/widgets';
  return (
    <div className="auth"><div className="card">
      <div className="auth-icon"><Icon name="person" size={26} /></div><h1>{t('auth.registerTitle')}</h1>
      <p className="muted">{t('auth.registerLead')}</p>
      <AuthForm mode="register" next={next} enabled={hasSupabase} />
      <p className="small muted" style={{ marginBottom: 0 }}>{t('auth.haveAccount')} <Link href={`/login?next=${encodeURIComponent(next)}`}>{t('nav.login')}</Link></p>
    </div></div>
  );
}
