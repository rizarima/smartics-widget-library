import Link from 'next/link';
import { ACTION_LABEL, ENTITY_LABEL } from '@/lib/audit-labels';
import { ROLE_LABEL } from '@/lib/roles';

const TYPE_OF = { news: 'berita', packages: 'package', updates: 'update' };
const fmt = v => (v == null || v === '' ? '–' : typeof v === 'object' ? JSON.stringify(v) : String(v));

// link to the record when it still has a page
export function recordLink(e) {
  if (!e.entity_id) return null;
  if (e.entity === 'widget' && !/delete/.test(e.action)) return `/widgets/${e.entity_id}`;
  if (TYPE_OF[e.entity] && e.action !== 'content.delete') return `/${TYPE_OF[e.entity]}/${e.entity_id}`;
  return null;
}

export function Details({ details }) {
  if (!details || typeof details !== 'object' || !Object.keys(details).length) return null;
  const rows = Object.entries(details);
  return (
    <details className="audit-details">
      <summary>{rows.length} perubahan</summary>
      <table><tbody>
        {rows.map(([k, v]) => (
          <tr key={k}><td className="muted">{k}</td><td>{Array.isArray(v) && v.length === 2 ? <><del>{fmt(v[0])}</del> → <ins>{fmt(v[1])}</ins></> : fmt(v)}</td></tr>
        ))}
      </tbody></table>
    </details>
  );
}

export default function AuditRow({ e }) {
  const href = recordLink(e);
  const label = ACTION_LABEL[e.action] || e.action;
  const ent = ENTITY_LABEL[e.entity] || e.entity;
  return (
    <tr>
      <td className="small" style={{ whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}</td>
      <td><b>{e.actor_name || 'Sistem'}</b><br />{e.actor_role && <span className={'role-chip r-' + e.actor_role}>{ROLE_LABEL[e.actor_role] || e.actor_role}</span>}</td>
      <td>{label}{e.action.startsWith('content.') ? ' ' + ent.toLowerCase() : ''}<br /><span className="muted small">{ent}</span></td>
      <td>{href ? <Link href={href} target="_blank">{e.summary || e.entity_id}</Link> : e.summary || e.entity_id || '–'}<Details details={e.details} /></td>
    </tr>
  );
}
