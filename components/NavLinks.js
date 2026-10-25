'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { useLang } from './LangProvider';

export default function NavLinks({ admin }) {
  const path = usePathname();
  const { t } = useLang();
  const items = [['/', t('nav.dashboard'), 'dashboard'], ['/widgets', t('nav.widgets'), 'widgets'], ['/berita', t('nav.news'), 'news'], ['/package', t('nav.packages'), 'package'], ['/update', t('nav.updates'), 'update']];
  if (admin) items.push(['/admin', t('nav.admin'), 'admin']);
  return (
    <nav className="nav">
      {items.map(([href, label, icon]) => (
        <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}><Icon name={icon} size={18} />{label}</Link>
      ))}
    </nav>
  );
}
