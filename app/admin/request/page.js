import { requireAdmin } from '@/lib/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Requests() {
  const { db } = await requireAdmin('/admin/request');
  const { data } = await db.from('widget_requests').select('*').order('created_at', { ascending: false }).limit(300);
  return (
    <>
      <div className="page-head"><div><h1>Request widget</h1><p>Semua permintaan detail yang dikirim lewat tombol Request (salinan dari pesan WhatsApp).</p></div></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Waktu</th><th>Nama</th><th>Perusahaan</th><th>Email</th><th>Widget</th></tr></thead>
          <tbody>
            {(data || []).map(r => (
              <tr key={r.id}>
                <td className="small">{new Date(r.created_at).toLocaleString('id-ID')}</td>
                <td>{r.name}</td><td>{r.company}</td>
                <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                <td><Link href={`/widgets/${r.widget_slug}`}>{r.widget_slug}</Link></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="muted">Belum ada request.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
