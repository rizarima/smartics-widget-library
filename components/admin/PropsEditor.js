'use client';

// table to set each property's label and purpose ("Fungsi"); rows without a purpose are highlighted
export const missingDesc = props => (props || []).filter(p => !String(p.desc || '').trim()).length;

export default function PropsEditor({ value, onChange }) {
  const set = (i, k, v) => onChange(value.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  if (!value?.length) return <p className="muted small" style={{ margin: 0 }}>Widget ini tidak punya properti.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="prop-edit">
        <thead><tr><th>Properti</th><th>Label</th><th>Fungsi (tampil di halaman detail)</th></tr></thead>
        <tbody>
          {value.map((p, i) => (
            <tr key={p.name} className={String(p.desc || '').trim() ? '' : 'todo'}>
              <td><code>{p.name}</code><br /><span className="muted small">{p.type}{p.default != null && p.default !== '' ? ` · default ${String(p.default)}` : ''}</span></td>
              <td><input value={p.label || ''} onChange={e => set(i, 'label', e.target.value)} aria-label={`Label ${p.name}`} /></td>
              <td><textarea rows={2} value={p.desc || ''} placeholder="Belum diketahui. Tulis fungsi properti ini…" onChange={e => set(i, 'desc', e.target.value)} aria-label={`Fungsi ${p.name}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
