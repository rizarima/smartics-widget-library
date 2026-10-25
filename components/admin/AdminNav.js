'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../Icon';

const ITEMS = [
  ['/admin', 'Ringkasan', 'dashboard'], ['/admin/partner', 'User & peran', 'person'], ['/admin/widget', 'Widget', 'widgets'],
  ['/admin/konten/berita', 'Berita', 'news'], ['/admin/konten/package', 'Package', 'package'], ['/admin/konten/update', 'Update', 'update'], ['/admin/request', 'Request', 'chat'],
];

export default function AdminNav({ pending }) {
  const path = usePathname();
  return (
    <nav className="side">
      {ITEMS.map(([href, label, icon]) => (
        <Link key={href} href={href} className={(href === '/admin' ? path === href : path.startsWith(href)) ? 'on' : ''}>
          <Icon name={icon} size={18} />{label}{href === '/admin/partner' && pending > 0 && <span className="count">{pending}</span>}
        </Link>
      ))}
    </nav>
  );
}
