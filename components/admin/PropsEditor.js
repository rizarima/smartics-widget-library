'use client';
import { useLang } from '../LangProvider';

// table to set each property's label and purpose ("Fungsi"); rows without a purpose are highlighted
export const missingDesc = props => (props || []).filter(p => !String(p.desc || '').trim()).length;

export default function PropsEditor({ value, onChange }) {
  const { t } = useLang();
  const set = (i, k, v) => onChange(value.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  if (!value?.length) return <p className="muted small" style={{ margin: 0 }}>{t('adm.widget.noProps')}</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="prop-edit">
        <thead><tr><th>{t('adm.widget.colProp')}</th><th>{t('adm.widget.colLabel')}</th><th>{t('adm.widget.colPurpose')}</th></tr></thead>
        <tbody>
          {value.map((p, i) => (
            <tr key={p.name} className={String(p.desc || '').trim() ? '' : 'todo'}>
              <td><code>{p.name}</code><br /><span className="muted small">{p.type}{p.default != null && p.default !== '' ? ` · default ${String(p.default)}` : ''}</span></td>
              <td><input value={p.label || ''} onChange={e => set(i, 'label', e.target.value)} aria-label={`${t('adm.widget.colLabel')} ${p.name}`} /></td>
              <td><textarea rows={2} value={p.desc || ''} placeholder={t('adm.widget.purposePh')} onChange={e => set(i, 'desc', e.target.value)} aria-label={`${t('adm.widget.colPurpose')} ${p.name}`} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
