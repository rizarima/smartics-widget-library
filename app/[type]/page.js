import { notFound } from 'next/navigation';
import PostCard from '@/components/PostCard';
import Icon from '@/components/Icon';
import { getContent } from '@/lib/data';
import { TYPES } from '@/lib/content-types';
import { localizePost } from '@/lib/i18n-data';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export function generateMetadata({ params }) { return { title: TYPES[params.type] ? getT().t(`type.${params.type}.label`) : '' }; }

export default async function ContentList({ params }) {
  const t = TYPES[params.type];
  if (!t) notFound();
  const { lang, t: tr } = getT();
  const items = (await getContent(t.table)).map(x => localizePost(x, lang));
  return (
    <>
      <div className="page-head">
        <div><h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="tone tone-blue"><Icon name={t.icon} size={24} /></span>{tr(`type.${params.type}.title`)}</h1><p>{tr(`type.${params.type}.desc`)}</p></div>
      </div>
      {items.length ? <div className="posts">{items.map(x => <PostCard key={x.id} type={params.type} item={x} lang={lang} />)}</div> : <div className="card muted">{tr(`type.${params.type}.none`)}</div>}
    </>
  );
}
