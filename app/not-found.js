import Link from 'next/link';
import { getT } from '@/lib/lang';
export default function NotFound() {
  const { t } = getT();
  return <div className="card"><h1>{t('notfound.title')}</h1><p><Link href="/widgets">{t('notfound.back')}</Link></p></div>;
}
