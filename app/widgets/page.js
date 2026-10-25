import Link from 'next/link';
import WidgetCard from '@/components/WidgetCard';
import { listWidgets, getStats } from '@/lib/data';
import Icon, { CAT_ICON } from '@/components/Icon';
import { CATEGORIES, PER_PAGE } from '@/lib/site';
import { localizeWidget, categoryDesc } from '@/lib/i18n-data';
import { getT } from '@/lib/lang';

export const dynamic = 'force-dynamic';
export function generateMetadata() { return { title: getT().t('nav.widgets') }; }

const href = (o) => {
  const p = new URLSearchParams();
  if (o.cat) p.set('cat', o.cat);
  if (o.q) p.set('q', o.q);
  if (o.page > 1) p.set('page', o.page);
  const s = p.toString();
  return '/widgets' + (s ? '?' + s : '');
};

export default async function Widgets({ searchParams }) {
  const { lang, t } = getT();
  const cat = CATEGORIES.some(c => c.id === searchParams.cat) ? searchParams.cat : '';
  const q = (searchParams.q || '').slice(0, 60);
  const page = Math.max(1, parseInt(searchParams.page, 10) || 1);
  const [{ items, total }, stats] = await Promise.all([listWidgets({ page, cat, q }), getStats()]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total ? (page - 1) * PER_PAGE + 1 : 0, to = Math.min(total, page * PER_PAGE);
  return (
    <>
      <div className="page-head">
        <div><h1>{t('nav.widgets')}</h1><p>{t('list.summary', { n: total })}{cat ? t('list.inCat', { c: cat }) : ''}{q ? t('list.forQ', { q }) : ''}{t('list.showing', { a: from, b: to })}</p></div>
      </div>
      <div className="filters">
        <Link href={href({ q })} className={'fchip' + (!cat ? ' on' : '')}>{!cat && <Icon name="check" size={16} />}{t('all')} <span className="count">{stats.total}</span></Link>
        {CATEGORIES.map(c => <Link key={c.id} href={href({ cat: c.id, q })} title={categoryDesc(lang, c)} className={'fchip' + (cat === c.id ? ' on' : '')}><Icon name={cat === c.id ? 'check' : CAT_ICON[c.id]} size={16} />{c.label} <span className="count">{stats.perCat[c.id] || 0}</span></Link>)}
        <form className="search" action="/widgets">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <Icon name="search" size={18} />
          <input name="q" defaultValue={q} placeholder={t('search.widgetPh')} aria-label={t('search.widget')} />
          <button className="btn btn-filled btn-sm">{t('search')}</button>
        </form>
      </div>
      {items.length ? <div className="wgrid">{items.map(w => <WidgetCard key={w.slug} w={localizeWidget(w, lang)} lang={lang} />)}</div> : <div className="card muted">{t('list.none')} <Link href="/widgets">{t('list.showAll')}</Link></div>}
      {pages > 1 && (
        <nav className="pager" aria-label={t('list.pages')}>
          {page > 1 ? <Link href={href({ cat, q, page: page - 1 })}><Icon name="back" size={18} />{t('list.prev')}</Link> : <span className="off"><Icon name="back" size={18} />{t('list.prev')}</span>}
          {Array.from({ length: pages }, (_, i) => i + 1).map(n => (n === page ? <span key={n} className="on">{n}</span> : <Link key={n} href={href({ cat, q, page: n })}>{n}</Link>))}
          {page < pages ? <Link href={href({ cat, q, page: page + 1 })}>{t('list.next')}<Icon name="arrow" size={18} /></Link> : <span className="off">{t('list.next')}<Icon name="arrow" size={18} /></span>}
        </nav>
      )}
    </>
  );
}
