import Link from 'next/link';
import Icon from '@/components/Icon';
import { requireAdmin } from '@/lib/admin';
import { ROLE_LABEL } from '@/lib/roles';

export const dynamic = 'force-dynamic';
const HISTORY_LIMIT = 2000; // enough for aggregation at this site's scale; raise if the user base grows a lot
const where = place => place ? [place.city, place.city && place.country ? ', ' : '', place.country].filter(Boolean).join('') || '-' : '-';
const fmt = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default async function AdminAnalytics({ searchParams }) {
  const { db } = await requireAdmin('/admin/analytics');
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
    ['hourglass', 'tone-blue', logins30, `Login 30 hari (${loginsTotal} total)`],
    ['download', 'tone-teal', downloads30, `Download 30 hari (${downloadsTotal} total)`],
    ['person', 'tone-amber', uniqueLoginUsers, 'User pernah login'],
    ['person', 'tone-purple', uniqueDownloadUsers, 'User pernah download'],
  ];

  return (
    <>
      <div className="page-head"><div><h1>Analytics</h1><p>Login, download, dan asal akses (negara/kota berdasarkan IP — hanya akurat di produksi Vercel, bukan saat development lokal).</p></div></div>
      <div className="stats">{cards.map(([i, t, n, l]) => <div key={l} className="stat"><span className={'tone ' + t}><Icon name={i} size={24} /></span><span><b>{n}</b><span>{l}</span></span></div>)}</div>

      <div className="grid cols-2">
        <div className="card">
          <div className="section-head"><h2><Icon name="widgets" />Widget paling banyak diunduh</h2></div>
          <table className="table">
            <thead><tr><th>Widget</th><th>Jumlah</th></tr></thead>
            <tbody>
              {topWidgets.map(([slug, n]) => <tr key={slug}><td><Link href={`/widgets/${slug}`}>{slug}</Link></td><td>{n}</td></tr>)}
              {!topWidgets.length && <tr><td colSpan={2} className="muted">Belum ada download.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-head"><h2><Icon name="person" />Aktivitas per user</h2></div>
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>User</th><th>Login</th><th>Download</th><th>Login terakhir</th><th>Lokasi terakhir</th></tr></thead>
              <tbody>
                {userRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.p.full_name || r.p.email}<br /><span className="muted small">{ROLE_LABEL[r.p.role] || r.p.role}</span></td>
                    <td>{r.logins}</td>
                    <td>{r.downloads}</td>
                    <td>{r.lastLogin ? fmt(r.lastLogin) : '-'}</td>
                    <td>{where(r.lastPlace)}</td>
                  </tr>
                ))}
                {!userRows.length && <tr><td colSpan={5} className="muted">Belum ada aktivitas.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2><Icon name="login" />Riwayat login (50 terbaru)</h2></div>
        <form className="audit-filters" method="get">
          <input type="hidden" name="du" value={dlUser} /><input type="hidden" name="dw" value={dlWidget} />
          <select name="lu" defaultValue={loginUser}><option value="">Semua user</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select>
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />Filter</button>
          {loginUser && <Link className="btn btn-sm btn-text" href={`/admin/analytics?du=${dlUser}&dw=${dlWidget}`}>Reset</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Waktu</th><th>User</th><th>Peran</th><th>Lokasi</th></tr></thead>
            <tbody>
              {filteredLogins.map((l, i) => <tr key={i}><td>{fmt(l.created_at)}</td><td>{l.user_name || l.email}</td><td>{ROLE_LABEL[l.role] || l.role}</td><td>{where(l)}</td></tr>)}
              {!filteredLogins.length && <tr><td colSpan={4} className="muted">Belum ada catatan login.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="section-head"><h2><Icon name="download" />Riwayat download (50 terbaru)</h2></div>
        <form className="audit-filters" method="get">
          <input type="hidden" name="lu" value={loginUser} />
          <select name="du" defaultValue={dlUser}><option value="">Semua user</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select>
          <input name="dw" defaultValue={dlWidget} placeholder="Cari slug widget…" />
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />Filter</button>
          {(dlUser || dlWidget) && <Link className="btn btn-sm btn-text" href={`/admin/analytics?lu=${loginUser}`}>Reset</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Waktu</th><th>User</th><th>Widget</th><th>Lokasi</th></tr></thead>
            <tbody>
              {filteredDownloads.map((d, i) => {
                const p = peopleById.get(d.user_id);
                return <tr key={i}><td>{fmt(d.created_at)}</td><td>{p?.full_name || p?.email || '-'}</td><td><Link href={`/widgets/${d.widget_slug}`}>{d.widget_slug}</Link></td><td>{where(d)}</td></tr>;
              })}
              {!filteredDownloads.length && <tr><td colSpan={4} className="muted">Belum ada catatan download.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
