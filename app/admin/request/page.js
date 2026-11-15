import { requireAdmin } from '@/lib/admin';
import Link from 'next/link';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

export default async function Requests() {
  const { db } = await requireAdmin('/admin/request');
  const { lang, t } = getT();
  const { data } = await db.from('widget_requests').select('*').order('created_at', { ascending: false }).limit(300);
  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const locale = localeMap[lang] || 'id-ID';
  return (
    <>
      <div className="page-head"><div><h1>{t('adm.request.title')}</h1><p>{t('adm.request.lead')}</p></div></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>{t('adm.request.colTime')}</th><th>{t('adm.request.colName')}</th><th>{t('adm.request.colCompany')}</th><th>{t('adm.request.colEmail')}</th><th>{t('adm.request.colWidget')}</th></tr></thead>
          <tbody>
            {(data || []).map(r => (
              <tr key={r.id}>
                <td className="small">{new Date(r.created_at).toLocaleString(locale)}</td>
                <td>{r.name}</td><td>{r.company}</td>
                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td><Link href={`/widgets/${r.widget_slug}`}>{r.widget_slug}</Link></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="muted">{t('adm.request.none')}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
