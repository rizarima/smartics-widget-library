import Link from 'next/link';
import Icon from '@/components/Icon';
import { requireAdmin } from '@/lib/admin';
import { allWidgets } from '@/lib/data';
import { actionLabel } from '@/lib/audit-labels';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { db } = await requireAdmin();
  const { lang, t } = getT();
  const count = async (tbl, f) => { let q = db.from(tbl).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count || 0; };
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [pending, partners, requests, downloads, widgets, recent, activity] = await Promise.all([
    count('profiles', q => q.eq('role', 'partner').eq('status', 'pending')),
    count('profiles', q => q.eq('role', 'partner').eq('status', 'approved')),
    count('widget_requests', q => q.gte('created_at', since)),
    count('downloads', q => q.gte('created_at', since)),
    allWidgets(),
    db.from('downloads').select('widget_slug, created_at').order('created_at', { ascending: false }).limit(8),
    db.from('audit_log').select('id, created_at, actor_name, action, summary').order('created_at', { ascending: false }).limit(8),
  ]);
  const cards = [
    ['/admin/partner', 'hourglass', 'tone-amber', pending, t('adm.home.pendingPartner')],
    ['/admin/partner', 'person', 'tone-teal', partners, t('adm.home.activePartner')],
    ['/admin/request', 'chat', 'tone-purple', requests, t('adm.home.requests30')],
    ['/admin/widget', 'download', 'tone-blue', downloads, t('adm.home.downloads30')],
    ['/admin/widget', 'widgets', 'tone-slate', widgets.length, t('adm.home.widgetsLive')],
  ];
  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const locale = localeMap[lang] || 'id-ID';
  return (
    <>
      <div className="page-head"><div><h1>{t('adm.home.title')}</h1><p>{t('adm.home.lead')}</p></div></div>
      <div className="stats">{cards.map(([h, i, tone, n, l]) => <Link key={l} href={h} className="stat"><span className={'tone ' + tone}><Icon name={i} size={24} /></span><span><b>{n}</b><span>{l}</span></span></Link>)}</div>
      <div className="grid cols-2">
        <div className="card">
          <div className="section-head"><h2><Icon name="add" />{t('adm.home.quickPost')}</h2></div>
          <div className="actions" style={{ margin: 0 }}>
            <Link className="btn btn-tonal" href="/admin/konten/berita?new=1"><Icon name="news" size={18} />{t('adm.home.newsNew')}</Link>
            <Link className="btn btn-tonal" href="/admin/konten/package?new=1"><Icon name="package" size={18} />{t('adm.home.packageNew')}</Link>
            <Link className="btn btn-tonal" href="/admin/konten/update?new=1"><Icon name="update" size={18} />{t('adm.home.updateNew')}</Link>
            <Link className="btn btn-tonal" href="/admin/widget"><Icon name="upload" size={18} />{t('adm.home.uploadWidget')}</Link>
          </div>
        </div>
        <div className="card">
          <div className="section-head"><h2><Icon name="download" />{t('adm.home.recentDownloads')}</h2></div>
          {recent.data?.length ? <ul className="feed">{recent.data.map((d, i) => <li key={i}><Link href={`/widgets/${d.widget_slug}`}><span><b>{d.widget_slug}</b><span className="meta">{new Date(d.created_at).toLocaleString(locale)}</span></span></Link></li>)}</ul> : <p className="muted">{t('adm.home.noDownloads')}</p>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2><Icon name="audit" />{t('adm.home.recentActivity')}</h2><Link className="link-more" href="/admin/audit">{t('adm.home.seeAudit')}<Icon name="arrow" size={16} /></Link></div>
        {activity.data?.length ? <ul className="feed">{activity.data.map(a => <li key={a.id}><Link href="/admin/audit"><span><b>{a.actor_name || t('adm.home.system')}</b> · {actionLabel(t, a.action)}{a.summary ? `: ${a.summary}` : ''}<span className="meta">{new Date(a.created_at).toLocaleString(locale, { timeZone: 'Asia/Jakarta' })}</span></span></Link></li>)}</ul> : <p className="muted">{t('adm.home.noActivity')}</p>}
      </div>
    </>
  );
}
