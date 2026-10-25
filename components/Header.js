import Link from 'next/link';
import { getCurrentUser, hasSupabase } from '@/lib/supabase-server';
import { getT } from '@/lib/lang';
import NavLinks from './NavLinks';
import LangSwitch from './LangSwitch';
import Icon from './Icon';

export default async function Header() {
  const user = hasSupabase ? await getCurrentUser() : null;
  const { t } = getT();
  return (
    <header className="appbar">
      <div className="container">
        <Link href="/" className="brand">
          <span className="logo"><Icon name="widgets" size={20} /></span>
          <span>SmartICS<small>Widget Library</small></span>
        </Link>
        <NavLinks admin={user?.role === 'admin'} />
        <div className="user">
          <LangSwitch />
          {user ? (
            <>
              <span className="avatar" title={user.email}>{(user.name || '?').trim()[0].toUpperCase()}</span>
              <span className="who"><b>{user.name}</b><span className="muted">{t('role.' + user.role)}{user.role === 'partner' && user.status !== 'approved' ? t('role.pending') : ''}</span></span>
              <form action="/auth/signout" method="post"><button className="btn btn-text btn-icon" title={t('nav.logout')} aria-label={t('nav.logout')}><Icon name="logout" /></button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-text btn-sm"><Icon name="login" size={18} />{t('nav.login')}</Link>
              <Link href="/daftar-partner" className="btn btn-filled btn-sm">{t('nav.register')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
