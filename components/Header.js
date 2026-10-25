import Link from 'next/link';
import { getCurrentUser, hasSupabase } from '@/lib/supabase-server';
import NavLinks from './NavLinks';
import Icon from './Icon';

const ROLE = { member: 'Member', partner: 'Partner', admin: 'Admin' };

export default async function Header() {
  const user = hasSupabase ? await getCurrentUser() : null;
  return (
    <header className="appbar">
      <div className="container">
        <Link href="/" className="brand">
          <span className="logo"><Icon name="widgets" size={20} /></span>
          <span>SmartICS<small>Widget Library</small></span>
        </Link>
        <NavLinks admin={user?.role === 'admin'} />
        <div className="user">
          {user ? (
            <>
              <span className="avatar" title={user.email}>{(user.name || '?').trim()[0].toUpperCase()}</span>
              <span className="who"><b>{user.name}</b><span className="muted">{ROLE[user.role] || user.role}{user.role === 'partner' && user.status !== 'approved' ? ' · menunggu persetujuan' : ''}</span></span>
              <form action="/auth/signout" method="post"><button className="btn btn-text btn-icon" title="Keluar" aria-label="Keluar"><Icon name="logout" /></button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-text btn-sm"><Icon name="login" size={18} />Login</Link>
              <Link href="/daftar-partner" className="btn btn-filled btn-sm">Daftar Partner</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
