import { notFound } from 'next/navigation';
import PostCard from '@/components/PostCard';
import Icon from '@/components/Icon';
import { getContent } from '@/lib/data';
import { TYPES } from '@/lib/content-types';

export const dynamic = 'force-dynamic';
export function generateMetadata({ params }) { return { title: TYPES[params.type]?.label || 'Halaman' }; }

export default async function ContentList({ params }) {
  const t = TYPES[params.type];
  if (!t) notFound();
  const items = await getContent(t.table);
  return (
    <>
      <div className="page-head">
        <div><h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="tone tone-blue"><Icon name={t.icon} size={24} /></span>{t.title}</h1><p>{t.desc}</p></div>
      </div>
      {items.length ? <div className="posts">{items.map(x => <PostCard key={x.id} type={params.type} item={x} />)}</div> : <div className="card muted">Belum ada {t.label.toLowerCase()}.</div>}
    </>
  );
}
