import Link from 'next/link';
import WidgetCard from '@/components/WidgetCard';
import { getStats, latestWidgets, getContent } from '@/lib/data';
import { CATEGORIES, fmtDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [stats, latest, updates, packages, news] = await Promise.all([getStats(), latestWidgets(8), getContent('updates', 5), getContent('packages', 3), getContent('news', 4)]);
  return (
    <>
      <div className="hero">
        <div>
          <h1>Dashboard</h1>
          <p>Semua widget SCADA SmartICS di satu tempat. Lihat, coba simulasinya, lalu unduh atau minta detail widget.</p>
        </div>
        <Link href="/widgets" className="btn btn-primary">Lihat semua widget</Link>
      </div>

      <div className="stats">
        <div className="stat"><b>{stats.total}</b><span>Total widget</span></div>
        {CATEGORIES.map(c => (
          <Link key={c.id} href={`/widgets?cat=${c.id}`} className="stat" style={{ color: 'inherit' }}><b>{stats.perCat[c.id] || 0}</b><span>{c.label}</span></Link>
        ))}
      </div>

      <div className="grid dash">
        <div className="grid">
          <section className="card">
            <div className="section-head"><h2>Widget saya</h2><Link href="/widgets" className="small">Semua widget →</Link></div>
            <div className="wgrid">{latest.map(w => <WidgetCard key={w.slug} w={w} />)}</div>
          </section>
          <section className="card">
            <div className="section-head"><h2>Package terbaru</h2></div>
            <div className="pkgs">
              {packages.map(p => (
                <div key={p.id} className="pkg">
                  <span className="ver">v{p.version}</span>
                  <b>{p.name}</b>
                  <p className="muted small" style={{ margin: '6px 0' }}>{p.description}</p>
                  <div className="chips"><span className="chip">{p.count} widget</span><span className="chip">{p.template}</span></div>
                  <p className="small" style={{ margin: '8px 0 0' }}><Link href={`/widgets?cat=${p.category}`}>Lihat widget →</Link> <span className="muted">· {fmtDate(p.date)}</span></p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="grid">
          <section className="card">
            <h2>Update terbaru</h2>
            <ul className="feed">{updates.map(u => <li key={u.id}><time>{fmtDate(u.date)}</time><b>{u.title}</b><span className="muted small">{u.body}</span></li>)}</ul>
          </section>
          <section className="card">
            <h2>Berita terbaru</h2>
            <ul className="feed">{news.map(n => <li key={n.id}><time>{fmtDate(n.date)}</time><b>{n.title}</b><span className="muted small">{n.body}</span></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
