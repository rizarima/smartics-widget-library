import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWidget, relatedWidgets } from '@/lib/data';
import { getCurrentUser, hasSupabase } from '@/lib/supabase-server';
import WidgetCard from '@/components/WidgetCard';
import Simulator from '@/components/Simulator';
import RequestButton from '@/components/RequestButton';
import { fmtDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const w = await getWidget(params.slug);
  return { title: w ? w.name : 'Widget' };
}

export default async function WidgetDetail({ params }) {
  const w = await getWidget(params.slug);
  if (!w) notFound();
  const [user, related] = await Promise.all([hasSupabase ? getCurrentUser() : null, relatedWidgets(w)]);
  return (
    <>
      <div className="crumbs"><Link href="/widgets">Widget</Link> / <Link href={`/widgets?cat=${w.categories[0]}`}>{w.categories[0]}</Link> / {w.name}</div>
      <div className="grid detail">
        <section className="card">
          <Simulator svg={w.svg} name={w.name} />
        </section>
        <section className="grid">
          <div className="card">
            <h1>{w.name}</h1>
            <div className="chips" style={{ marginBottom: 12 }}>
              <span className="chip">{w.kind}</span>
              {w.categories.map(c => <Link key={c} href={`/widgets?cat=${c}`} className="chip">{c}</Link>)}
              <span className={'chip' + (w.template.startsWith('Template 2') ? ' t2' : '')}>{w.template}</span>
            </div>
            <p>{w.description}</p>
            <p className="muted small">File: <code>{w.file_name}</code> · Ditambahkan {fmtDate(w.created_at)}</p>
            <div className="actions">
              {user ? (
                <a className="btn btn-primary" href={`/api/widgets/${w.slug}/download`}>⬇ Download widget</a>
              ) : (
                <Link className="btn btn-primary" href={`/login?next=/widgets/${w.slug}`}>🔒 Login untuk download</Link>
              )}
              <RequestButton slug={w.slug} name={w.name} />
            </div>
            {!user && <p className="muted small" style={{ margin: 0 }}>Download tersedia untuk member SmartICS dan partner. Belum punya akun? <Link href={`/daftar-partner?next=/widgets/${w.slug}`}>Daftar sebagai partner</Link>.</p>}
          </div>
          <div className="card">
            <h2>Properties</h2>
            <p className="muted small">Pengaturan yang muncul di SmartICS saat widget dipasang, dan apa yang bisa dilakukan dengannya.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="props">
                <thead><tr><th>Properti</th><th>Tipe</th><th>Fungsi</th></tr></thead>
                <tbody>
                  {w.properties.map(p => (
                    <tr key={p.name}>
                      <td><b>{p.label}</b><br /><code>{p.name}</code></td>
                      <td className="small">{p.type}{p.default != null && p.default !== '' ? <><br /><span className="muted">default: {String(p.default)}</span></> : null}</td>
                      <td className="small">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      {related.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="section-head"><h2>Widget terkait</h2><Link className="small" href={`/widgets?cat=${w.categories[0]}`}>Lihat {w.categories[0]} →</Link></div>
          <div className="wgrid">{related.map(r => <WidgetCard key={r.slug} w={r} />)}</div>
        </section>
      )}
    </>
  );
}
