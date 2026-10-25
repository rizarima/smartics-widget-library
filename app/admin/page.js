import Link from 'next/link';
import Icon from '@/components/Icon';
import { requireAdmin } from '@/lib/admin';
import { allWidgets } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { db } = await requireAdmin();
  const count = async (t, f) => { let q = db.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count || 0; };
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [pending, partners, requests, downloads, widgets, recent] = await Promise.all([
    count('profiles', q => q.eq('role', 'partner').eq('status', 'pending')),
    count('profiles', q => q.eq('role', 'partner').eq('status', 'approved')),
    count('widget_requests', q => q.gte('created_at', since)),
    count('downloads', q => q.gte('created_at', since)),
    allWidgets(),
    db.from('downloads').select('widget_slug, created_at').order('created_at', { ascending: false }).limit(8),
  ]);
  const cards = [
    ['/admin/partner', 'hourglass', 'tone-amber', pending, 'Partner menunggu persetujuan'],
    ['/admin/partner', 'person', 'tone-teal', partners, 'Partner aktif'],
    ['/admin/request', 'chat', 'tone-purple', requests, 'Request 30 hari terakhir'],
    ['/admin/widget', 'download', 'tone-blue', downloads, 'Download 30 hari terakhir'],
    ['/admin/widget', 'widgets', 'tone-slate', widgets.length, 'Widget tayang'],
  ];
  return (
    <>
      <div className="page-head"><div><h1>Ringkasan admin</h1><p>Kelola partner, widget, berita, package, dan update.</p></div></div>
      <div className="stats">{cards.map(([h, i, t, n, l]) => <Link key={l} href={h} className="stat"><span className={'tone ' + t}><Icon name={i} size={24} /></span><span><b>{n}</b><span>{l}</span></span></Link>)}</div>
      <div className="grid cols-2">
        <div className="card">
          <div className="section-head"><h2><Icon name="add" />Posting cepat</h2></div>
          <div className="actions" style={{ margin: 0 }}>
            <Link className="btn btn-tonal" href="/admin/konten/berita?new=1"><Icon name="news" size={18} />Berita baru</Link>
            <Link className="btn btn-tonal" href="/admin/konten/package?new=1"><Icon name="package" size={18} />Package baru</Link>
            <Link className="btn btn-tonal" href="/admin/konten/update?new=1"><Icon name="update" size={18} />Update baru</Link>
            <Link className="btn btn-tonal" href="/admin/widget"><Icon name="upload" size={18} />Upload widget</Link>
          </div>
        </div>
        <div className="card">
          <div className="section-head"><h2><Icon name="download" />Download terakhir</h2></div>
          {recent.data?.length ? <ul className="feed">{recent.data.map((d, i) => <li key={i}><Link href={`/widgets/${d.widget_slug}`}><span><b>{d.widget_slug}</b><span className="meta">{new Date(d.created_at).toLocaleString('id-ID')}</span></span></Link></li>)}</ul> : <p className="muted">Belum ada download.</p>}
        </div>
      </div>
    </>
  );
}
