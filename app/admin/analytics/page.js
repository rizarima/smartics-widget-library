import Link from 'next/link';
import Icon from '@/components/Icon';
import { requireAdmin } from '@/lib/admin';
import { roleLabel } from '@/lib/roles';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
const HISTORY_LIMIT = 2000; // enough for aggregation at this site's scale; raise if the user base grows a lot
const where = place => place ? [place.city, place.city && place.country ? ', ' : '', place.country].filter(Boolean).join('') || '-' : '-';

export default async function AdminAnalytics({ searchParams }) {
  const { db } = await requireAdmin('/admin/analytics');
  const { lang, t } = getT();
  const localeMap = { id: 'id-ID', en: 'en-US', vi: 'vi-VN' };
  const fmt = d => new Date(d).toLocaleString(localeMap[lang] || 'id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const loginUser = searchParams.lu || '', dlUser = searchParams.du || '', dlWidget = (searchParams.dw || '').trim();

  const count = async (table, f) => { let q = db.from(table).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count || 0; };

  const [
    loginsTotal, logins30, downloadsTotal, downloads30,
    { data: allLogins }, { data: allDownloads },
    { data: people },
  ] = await Promise.all([
    count('login_log'),
    count('login_log', q => q.gte('created_at', since30)),
    count('downloads'),
    count('downloads', q => q.gte('created_at', since30)),
    db.from('login_log').select('user_id, user_name, email, role, country, city, created_at').order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    db.from('downloads').select('widget_slug, user_id, country, city, created_at').order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    db.from('profiles').select('id, full_name, email, role').order('full_name'),
  ]);

  const peopleById = new Map((people || []).map(p => [p.id, p]));
  const uniqueLoginUsers = new Set((allLogins || []).map(l => l.user_id)).size;
  const uniqueDownloadUsers = new Set((allDownloads || []).map(d => d.user_id)).size;

  // per widget ranking
  const perWidget = new Map();
  for (const d of allDownloads || []) perWidget.set(d.widget_slug, (perWidget.get(d.widget_slug) || 0) + 1);
  const topWidgets = [...perWidget.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // per user summary: logins, last login + lokasi, downloads
  const perUser = new Map();
  const touch = id => { if (!perUser.has(id)) perUser.set(id, { logins: 0, downloads: 0, lastLogin: null, lastPlace: null }); return perUser.get(id); };
  for (const l of allLogins || []) { const u = touch(l.user_id); u.logins++; if (!u.lastLogin || l.created_at > u.lastLogin) { u.lastLogin = l.created_at; u.lastPlace = { country: l.country, city: l.city }; } }
  for (const d of allDownloads || []) { const u = touch(d.user_id); u.downloads++; }
  const userRows = [...perUser.entries()].map(([id, v]) => ({ id, ...v, p: peopleById.get(id) })).filter(r => r.p).sort((a, b) => b.downloads - a.downloads || b.logins - a.logins);

  const filteredLogins = (allLogins || []).filter(l => !loginUser || l.user_id === loginUser).slice(0, 50);
  const filteredDownloads = (allDownloads || []).filter(d => (!dlUser || d.user_id === dlUser) && (!dlWidget || d.widget_slug.includes(dlWidget.toLowerCase()))).slice(0, 50);

  const cards = [
    ['hourglass', 'tone-blue', logins30, t('adm.analytics.logins30', { n: loginsTotal })],
    ['download', 'tone-teal', downloads30, t('adm.analytics.downloads30', { n: downloadsTotal })],
    ['person', 'tone-amber', uniqueLoginUsers, t('adm.analytics.everLoggedIn')],
    ['person', 'tone-purple', uniqueDownloadUsers, t('adm.analytics.everDownloaded')],
  ];

  return (
    <>
      <div className="page-head"><div><h1>{t('adm.analytics.title')}</h1><p>{t('adm.analytics.lead')}</p></div></div>
      <div className="stats">{cards.map(([i, tone, n, l]) => <div key={l} className="stat"><span className={'tone ' + tone}><Icon name={i} size={24} /></span><span><b>{n}</b><span>{l}</span></span></div>)}</div>

      <div className="grid cols-2">
        <div className="card">
          <div className="section-head"><h2><Icon name="widgets" />{t('adm.analytics.topWidgets')}</h2></div>
          <table className="table">
            <thead><tr><th>{t('adm.analytics.colWidget')}</th><th>{t('adm.analytics.colCount')}</th></tr></thead>
            <tbody>
              {topWidgets.map(([slug, n]) => <tr key={slug}><td><Link href={`/widgets/${slug}`}>{slug}</Link></td><td>{n}</td></tr>)}
              {!topWidgets.length && <tr><td colSpan={2} className="muted">{t('adm.analytics.noDownloads')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-head"><h2><Icon name="person" />{t('adm.analytics.perUser')}</h2></div>
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>{t('adm.analytics.colUser')}</th><th>{t('adm.analytics.colLogins')}</th><th>{t('adm.analytics.colDownloads')}</th><th>{t('adm.analytics.colLastLogin')}</th><th>{t('adm.analytics.colLastLocation')}</th></tr></thead>
              <tbody>
                {userRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.p.full_name || r.p.email}<br /><span className="muted small">{roleLabel(t, r.p.role)}</span></td>
                    <td>{r.logins}</td>
                    <td>{r.downloads}</td>
                    <td>{r.lastLogin ? fmt(r.lastLogin) : '-'}</td>
                    <td>{where(r.lastPlace)}</td>
                  </tr>
                ))}
                {!userRows.length && <tr><td colSpan={5} className="muted">{t('adm.analytics.noActivity')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2><Icon name="login" />{t('adm.analytics.loginHistory')}</h2></div>
        <form className="audit-filters" method="get">
          <input type="hidden" name="du" value={dlUser} /><input type="hidden" name="dw" value={dlWidget} />
          <select name="lu" defaultValue={loginUser}><option value="">{t('adm.analytics.allUsers')}</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select>
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />{t('adm.analytics.filter')}</button>
          {loginUser && <Link className="btn btn-sm btn-text" href={`/admin/analytics?du=${dlUser}&dw=${dlWidget}`}>{t('adm.analytics.reset')}</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>{t('adm.request.colTime')}</th><th>{t('adm.analytics.colUser')}</th><th>{t('adm.analytics.colRole')}</th><th>{t('adm.analytics.colLocation')}</th></tr></thead>
            <tbody>
              {filteredLogins.map((l, i) => <tr key={i}><td>{fmt(l.created_at)}</td><td>{l.user_name || l.email}</td><td>{roleLabel(t, l.role)}</td><td>{where(l)}</td></tr>)}
              {!filteredLogins.length && <tr><td colSpan={4} className="muted">{t('adm.analytics.noLoginHistory')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2><Icon name="download" />{t('adm.analytics.downloadHistory')}</h2></div>
        <form className="audit-filters" method="get">
          <input type="hidden" name="lu" value={loginUser} />
          <select name="du" defaultValue={dlUser}><option value="">{t('adm.analytics.allUsers')}</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select>
          <input name="dw" defaultValue={dlWidget} placeholder={t('adm.analytics.searchWidgetPh')} />
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />{t('adm.analytics.filter')}</button>
          {(dlUser || dlWidget) && <Link className="btn btn-sm btn-text" href={`/admin/analytics?lu=${loginUser}`}>{t('adm.analytics.reset')}</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>{t('adm.request.colTime')}</th><th>{t('adm.analytics.colUser')}</th><th>{t('adm.analytics.colWidget')}</th><th>{t('adm.analytics.colLocation')}</th></tr></thead>
            <tbody>
              {filteredDownloads.map((d, i) => {
                const p = peopleById.get(d.user_id);
                return <tr key={i}><td>{fmt(d.created_at)}</td><td>{p?.full_name || p?.email || '-'}</td><td><Link href={`/widgets/${d.widget_slug}`}>{d.widget_slug}</Link></td><td>{where(d)}</td></tr>;
              })}
              {!filteredDownloads.length && <tr><td colSpan={4} className="muted">{t('adm.analytics.noDownloadHistory')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
