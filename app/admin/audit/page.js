import Link from 'next/link';
import Icon from '@/components/Icon';
import AuditRow from '@/components/admin/AuditRow';
import { requireAdmin } from '@/lib/admin';
import { entityLabel } from '@/lib/audit-labels';
import { roleLabel } from '@/lib/roles';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
const PER = 50;

export default async function AuditTrail({ searchParams }) {
  const { db } = await requireAdmin('/admin/audit');
  const { t } = getT();
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
  const ENTITIES = ['user', 'news', 'packages', 'updates', 'widget', 'profile'];

  return (
    <>
      <div className="page-head"><div><h1>{t('adm.audit.title')}</h1><p>{t('adm.audit.lead')}</p></div></div>
      {error && <div className="notice err" style={{ marginBottom: 12 }}>{t('adm.audit.readError', { e: error.message })}</div>}
      <div className="card">
        <form className="audit-filters" method="get">
          <select name="entity" defaultValue={entity} aria-label={t('adm.audit.colRecord')}><option value="">{t('adm.audit.allRecords')}</option>{ENTITIES.map(k => <option key={k} value={k}>{entityLabel(t, k)}</option>)}</select>
          <select name="actor" defaultValue={actor} aria-label={t('adm.audit.colWho')}><option value="">{t('adm.audit.allPeople')}</option>{(people || []).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email} · {roleLabel(t, p.role)}</option>)}</select>
          <input name="q" defaultValue={q} placeholder={t('adm.audit.searchPh')} style={{ flex: 1, minWidth: 160 }} />
          <button className="btn btn-sm btn-filled"><Icon name="search" size={16} />{t('adm.audit.apply')}</button>
          {(entity || actor || q) && <Link className="btn btn-sm btn-text" href="/admin/audit">{t('adm.audit.reset')}</Link>}
        </form>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>{t('adm.audit.colTime')}</th><th>{t('adm.audit.colWho')}</th><th>{t('adm.audit.colAction')}</th><th>{t('adm.audit.colRecord')}</th></tr></thead>
            <tbody>
              {(data || []).map(e => <AuditRow key={e.id} e={e} />)}
              {!data?.length && <tr><td colSpan={4} className="muted">{t('adm.audit.none')}</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <span className="muted small">{t('adm.audit.nRecords', { n: count, p: page, t: pages })}</span>
            <span className="row-actions">
              {page > 1 && <Link className="btn btn-sm" href={link(page - 1)}>{t('adm.audit.prev')}</Link>}
              {page < pages && <Link className="btn btn-sm" href={link(page + 1)}>{t('adm.audit.next')}</Link>}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
