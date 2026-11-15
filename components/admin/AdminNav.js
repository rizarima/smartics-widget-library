'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '../Icon';
import { useLang } from '../LangProvider';

export default function AdminNav({ pending }) {
  const path = usePathname();
  const { t } = useLang();
  const ITEMS = [
    ['/admin', t('adm.nav.ringkasan'), 'dashboard'],
    ['/admin/analytics', t('adm.nav.analytics'), 'eye'],
    ['/admin/partner', t('adm.nav.partner'), 'person'],
    ['/admin/widget', t('adm.nav.widget'), 'widgets'],
    ['/admin/konten/berita', t('type.berita.label'), 'news'],
    ['/admin/konten/package', t('type.package.label'), 'package'],
    ['/admin/konten/update', t('type.update.label'), 'update'],
    ['/admin/request', t('adm.nav.request'), 'chat'],
    ['/admin/build', t('adm.nav.build'), 'lock'],
    ['/admin/trace', t('adm.nav.trace'), 'search'],
    ['/admin/audit', t('adm.nav.audit'), 'audit'],
  ];
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
