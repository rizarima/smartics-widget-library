import Link from 'next/link';
import { getCurrentUser, hasSupabase } from '@/lib/supabase-server';
import NavLinks from './NavLinks';

const ROLE = { member: 'Member', partner: 'Partner', admin: 'Admin' };

export default async function Header() {
  const user = hasSupabase ? await getCurrentUser() : null;
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand"><span className="brand-mark">SI</span>SmartICS Widget Library</Link>
        <NavLinks />
        <div className="user">
          {user ? (
            <>
              <span className="who">{user.name} · {ROLE[user.role] || user.role}</span>
              <form action="/auth/signout" method="post"><button className="btn btn-sm">Keluar</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm">Login</Link>
              <Link href="/daftar-partner" className="btn btn-sm btn-primary">Daftar Partner</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
