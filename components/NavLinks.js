'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function NavLinks({ admin }) {
  const path = usePathname();
  const items = [['/', 'Dashboard', 'dashboard'], ['/widgets', 'Widget', 'widgets'], ['/berita', 'Berita', 'news'], ['/package', 'Package', 'package'], ['/update', 'Update', 'update']];
  if (admin) items.push(['/admin', 'Admin', 'admin']);
  return (
    <nav className="nav">
      {items.map(([href, label, icon]) => (
        <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}><Icon name={icon} size={18} />{label}</Link>
      ))}
    </nav>
  );
}
