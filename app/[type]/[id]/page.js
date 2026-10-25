import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import RichText from '@/components/RichText';
import WidgetCard from '@/components/WidgetCard';
import { getContentItem, widgetsBySlugs } from '@/lib/data';
import { TYPES, itemTitle } from '@/lib/content-types';
import { fmtDateL } from '@/lib/i18n';
import { localizePost, localizeWidget, templateName } from '@/lib/i18n-data';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const t = TYPES[params.type];
  const x = t && await getContentItem(t.table, params.id);
  const { lang, t: tr } = getT();
  return { title: x ? itemTitle(localizePost(x, lang)) : tr('notfound.title') };
}

export default async function ContentDetail({ params }) {
  const t = TYPES[params.type];
  if (!t) notFound();
  const { lang, t: tr } = getT();
  const raw = await getContentItem(t.table, params.id);
  if (!raw) notFound();
  const x = localizePost(raw, lang);
  const widgets = params.type === 'package' ? await widgetsBySlugs(x.widget_slugs) : [];
  return (
    <>
      <article className="article">
        <Link href={`/${params.type}`} className="back"><Icon name="back" size={18} />{tr(`type.${params.type}.all`)}</Link>
        <div className="card" style={{ padding: 28 }}>
          <div className="chips" style={{ marginBottom: 10 }}>
            <span className="chip primary"><Icon name={t.icon} size={14} />{tr(`type.${params.type}.label`)}</span>
            <span className="chip"><Icon name="calendar" size={14} />{fmtDateL(lang, x.date)}</span>
            {x.version && <span className="chip">{tr('post.version', { v: x.version })}</span>}
            {x.template && <span className="chip t2">{templateName(lang, x.template)}</span>}
          </div>
          <h1>{itemTitle(x)}</h1>
          {x.description && <p className="muted" style={{ fontSize: 17, marginTop: 0 }}>{x.description}</p>}
          {x.image_url && <img className="cover" src={x.image_url} alt="" />}
          <RichText text={x.body} />
        </div>
      </article>
      {widgets.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <div className="section-head"><h2><Icon name="widgets" />{tr('post.inPackage', { n: widgets.length })}</h2></div>
          <div className="wgrid">{widgets.map(w => <WidgetCard key={w.slug} w={localizeWidget(w, lang)} lang={lang} />)}</div>
        </section>
      )}
    </>
  );
}
