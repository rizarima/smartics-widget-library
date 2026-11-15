'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../Icon';
import PropsEditor, { missingDesc } from './PropsEditor';
import { updateWidgetMeta } from '@/lib/admin-actions';

// on the widget detail page, for admins: edit the label and purpose of every property in place
export default function WidgetPropsAdmin({ slug, properties }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const todo = missingDesc(properties);
  const save = () => start(async () => {
    const r = await updateWidgetMeta(slug, { properties: edit });
    if (!r.ok) return setMsg({ err: r.error });
    setMsg({ ok: 'Properties tersimpan.' });
    setEdit(null);
    router.refresh();
  });
  return (
    <div className="admin-box">
      {!edit ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="small"><b>Admin:</b> {todo ? `${todo} properti belum punya penjelasan fungsi.` : 'Semua properti sudah punya penjelasan.'}</span>
          <button className="btn btn-sm btn-filled" onClick={() => { setMsg(null); setEdit(properties.map(p => ({ ...p }))); }}><Icon name="edit" size={16} />Ubah properties</button>
        </div>
      ) : (
        <>
          <PropsEditor value={edit} onChange={setEdit} />
          <div className="actions" style={{ margin: 0 }}>
            <button className="btn btn-filled btn-sm" disabled={busy} onClick={save}><Icon name="check" size={16} />{busy ? 'Menyimpan…' : 'Simpan properties'}</button>
            <button className="btn btn-text btn-sm" onClick={() => setEdit(null)}>Batal</button>
          </div>
        </>
      )}
      {msg?.err && <div className="notice err">{msg.err}</div>}
      {msg?.ok && <div className="notice ok">{msg.ok}</div>}
    </div>
  );
}
