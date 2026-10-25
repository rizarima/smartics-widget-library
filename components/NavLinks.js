'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks() {
  const path = usePathname();
  const items = [['/', 'Dashboard'], ['/widgets', 'Widget']];
  return (
    <nav className="nav">
      {items.map(([href, label]) => (
        <Link key={href} href={href} className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}>{label}</Link>
      ))}
    </nav>
  );
}
