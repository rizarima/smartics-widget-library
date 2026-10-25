import Link from 'next/link';
import Icon from './Icon';
import { fmtDateL } from '@/lib/i18n';
import { excerpt } from '@/lib/text';
import { TYPES, itemTitle } from '@/lib/content-types';

export default function PostCard({ type, item, lang = 'id' }) {
  const t = TYPES[type];
  return (
    <Link href={`/${type}/${item.id}`} className="post">
      <div className="post-cover" style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : null}>{!item.image_url && <Icon name={t.icon} size={44} />}</div>
      <div className="post-body">
        <span className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={14} />{fmtDateL(lang, item.date)}{item.version ? <span className="ver">v{item.version}</span> : null}</span>
        <h3 style={{ margin: 0 }}>{itemTitle(item)}</h3>
        <span className="muted small">{excerpt(item.description || item.body)}</span>
      </div>
    </Link>
  );
}
