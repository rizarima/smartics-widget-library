import Link from 'next/link';
import Icon from '@/components/Icon';
import { getCurrentUser, canDownload } from '@/lib/supabase-server';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export function generateMetadata() { return { title: getT().t('pend.title') }; }

export default async function Pending() {
  const user = await getCurrentUser();
  const ok = canDownload(user);
  const { t } = getT();
  return (
    <div className="auth"><div className="card" style={{ textAlign: 'center' }}>
      <div className="auth-icon" style={{ margin: '0 auto 12px' }}><Icon name={ok ? 'check' : 'hourglass'} size={26} /></div>
      <h1>{ok ? t('pend.activeTitle') : t('pend.title')}</h1>
      <p className="muted">{ok ? t('pend.active') : t('pend.thanks', { name: user ? ', ' + user.name : '', phone: user?.phone || t('pend.yourPhone') })}</p>
      <Link href="/widgets" className="btn btn-filled">{t('pend.see')}</Link>
    </div></div>
  );
}
