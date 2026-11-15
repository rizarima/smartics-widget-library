import Link from 'next/link';
import Icon from '@/components/Icon';
import AuditRow from '@/components/admin/AuditRow';
import { requireAdmin } from '@/lib/admin';
import { ENTITY_LABEL } from '@/lib/audit-labels';
import { ROLE_LABEL } from '@/lib/roles';

export const dynamic = 'force-dynamic';
const PER = 50;

export default async function AuditTrail({ searchParams }) {
  const { db } = await requireAdmin('/admin/audit');
  const entity = searchParams.entity || '', actor = searchParams.actor || '', q = (searchParams.q || '').trim();
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);

  let query = db.from('audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PER, page * PER - 1);
  if (entity) query = query.eq('entity', entity);
  if (actor) query = query.eq('actor_id', actor);
  if (q) { const s = q.replace(/[%,()]/g, ' '); query = query.or(`summary.ilike.%${s}%,actor_name.ilike.%${s}%,entity_id.ilike.%${s}%`); }
  const [{ data, count, error }, { data: people }] = await Promise.all([
    query,
    db.from('profiles').select('id, full_name, email, role').neq('role', 'partner').order('full_name'),
  ]);
  const pages = Math.max(1, Math.ceil((count || 0) / PER));
  const link = p => '/admin/audit?' + new URLSearchParams({ ...(entity && { entity }), ...(actor && { actor }), ...(q && { q }), page: String(p) });

  return (
    <>
      <div className="page-head"><div><h1>Audit trail</h1><p>Catatan siapa melakukan apa pada record (user, widget, berita, package, update, profil). Hanya admin dan superadmin yang bisa melihat, dan catatan tidak bisa diubah atau dihapus dari website.</p></div></div>
      {error && <div className="notice err" style={{ marginBottom: 12 }}>Audit trail belum bisa dibaca: {error.message}. Jalankan ulang <code>supabase/schema.sql</code> di Supabase.</div>}
      <div className="card">
        <form className="audit-filters" method="get">
          <select name="entity" defaultValue={entity} aria-label="Jenis record"><option value="">Semua record</option>{Object.entries(ENTITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select name="actor" defaultValue={actor} aria-label="Pelaku"><option value="">Semua orang</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email} · {ROLE_LABEL[p.role] || p.role}</option>)}</select>
          <input name="q" defaultValue={q} placeholder="Cari judul, nama, slug…" style={{ flex: 1, minWidth: 160 }} />
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />Terapkan</button>
          {(entity || actor || q) && <Link className="btn btn-sm btn-text" href="/admin/audit">Reset</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Waktu (WIB)</th><th>Siapa</th><th>Aksi</th><th>Record</th></tr></thead>
            <tbody>
              {(data || []).map(e => <AuditRow key={e.id} e={e} />)}
              {!data?.length && <tr><td colSpan={4} className="muted">Belum ada catatan.</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <span className="muted small">{count} catatan · halaman {page} dari {pages}</span>
            <span className="row-actions">
              {page > 1 && <Link className="btn btn-sm" href={link(page - 1)}>Sebelumnya</Link>}
              {page < pages && <Link className="btn btn-sm" href={link(page + 1)}>Berikutnya</Link>}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
