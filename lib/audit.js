import 'server-only';
import { BUCKET } from './images';

// one row in audit_log; the database fills in the actor's name and role. Never blocks the action itself.
export async function audit(db, user, action, entity, entityId, summary, details) {
  if (!db || !user) return;
  try {
    const { error } = await db.from('audit_log').insert({ actor_id: user.id, action, entity, entity_id: entityId == null ? null : String(entityId), summary: summary || null, details: details || null });
    if (error) console.error('audit:', error.message);
  } catch (e) { console.error('audit:', e); }
}

// fields whose value changed, as { field: [before, after] } (long texts shortened)
const short = v => (typeof v === 'string' && v.length > 300 ? v.slice(0, 300) + '…' : v);
export function diff(before, after, skip = []) {
  const out = {};
  for (const k of Object.keys(after)) {
    if (skip.includes(k)) continue;
    const a = before?.[k] ?? null, b = after[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = [short(a), short(b)];
  }
  return out;
}

export async function removeImage(db, path) {
  if (!db || !path) return;
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) console.error('remove image:', error.message);
}
