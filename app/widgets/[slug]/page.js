import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWidget, relatedWidgets } from '@/lib/data';
import { getCurrentUser, hasSupabase, canDownload } from '@/lib/supabase-server';
import WidgetCard from '@/components/WidgetCard';
import Simulator from '@/components/Simulator';
import RequestButton from '@/components/RequestButton';
import Icon, { CAT_ICON } from '@/components/Icon';
import { fmtDate } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const w = await getWidget(params.slug);
  return { title: w ? w.name : 'Widget' };
}

function DownloadArea({ user, slug }) {
  if (canDownload(user)) return <a className="btn btn-filled" href={`/api/widgets/${slug}/download`}><Icon name="download" size={18} />Download widget</a>;
  if (user) return <span className="btn btn-tonal" aria-disabled="true"><Icon name="hourglass" size={18} />Menunggu persetujuan admin</span>;
  return <Link className="btn btn-filled" href={`/login?next=/widgets/${slug}`}><Icon name="lock" size={18} />Login untuk download</Link>;
}

export default async function WidgetDetail({ params }) {
  const w = await getWidget(params.slug);
  if (!w) notFound();
  const [user, related] = await Promise.all([hasSupabase ? getCurrentUser() : null, relatedWidgets(w)]);
  return (
    <>
      <div className="crumbs"><Link href="/widgets">Widget</Link><Icon name="arrow" size={14} /><Link href={`/widgets?cat=${encodeURIComponent(w.categories[0])}`}>{w.categories[0]}</Link><Icon name="arrow" size={14} /><span>{w.name}</span></div>
      <div className="grid detail">
        <section className="card"><Simulator svg={w.svg} name={w.name} /></section>
        <section className="grid">
          <div className="card">
            <div className="chips" style={{ marginBottom: 10 }}>
              <span className="chip primary">{w.kind}</span>
              {w.categories.map(c => <Link key={c} href={`/widgets?cat=${encodeURIComponent(c)}`} className="chip"><Icon name={CAT_ICON[c]} size={13} />{c}</Link>)}
              <span className={'chip t' + ((w.template || '').match(/Template (\d)/)?.[1] || '1')}>{w.template}</span>
            </div>
            <h1>{w.name}</h1>
            <p style={{ marginTop: 0 }}>{w.description}</p>
            <p className="muted small">File <code>{w.file_name}</code> · ditambahkan {fmtDate(w.created_at)}</p>
            <div className="actions">
              <DownloadArea user={user} slug={w.slug} />
              <RequestButton slug={w.slug} name={w.name} />
            </div>
            {!user && <div className="notice"><Icon name="person" size={18} /><span>Download untuk member SmartICS dan partner yang sudah disetujui. <Link href={`/daftar-partner?next=/widgets/${w.slug}`}>Daftar sebagai partner</Link></span></div>}
            {user && !canDownload(user) && <div className="notice warn"><Icon name="hourglass" size={18} /><span>Akun partner Anda sedang ditinjau admin. Anda akan menerima WhatsApp begitu disetujui.</span></div>}
          </div>
          <div className="card">
            <div className="section-head"><h2><Icon name="edit" />Properties</h2></div>
            <p className="muted small" style={{ marginTop: -6 }}>Pengaturan yang muncul di SmartICS saat widget dipasang, dan apa yang bisa dilakukan dengannya.</p>
            <div style={{ overflowX: 'auto' }}>
              <table className="props">
                <thead><tr><th>Properti</th><th>Tipe</th><th>Fungsi</th></tr></thead>
                <tbody>
                  {(w.properties || []).map(p => (
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
        <section style={{ marginTop: 28 }}>
          <div className="section-head"><h2><Icon name={CAT_ICON[w.categories[0]] || 'widgets'} />Widget terkait</h2><Link className="link-more" href={`/widgets?cat=${encodeURIComponent(w.categories[0])}`}>Lihat {w.categories[0]}<Icon name="arrow" size={16} /></Link></div>
          <div className="wgrid">{related.map(r => <WidgetCard key={r.slug} w={r} />)}</div>
        </section>
      )}
    </>
  );
}
