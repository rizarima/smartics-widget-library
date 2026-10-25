import Link from 'next/link';
import WidgetCard from '@/components/WidgetCard';
import { listWidgets, getStats } from '@/lib/data';
import Icon, { CAT_ICON } from '@/components/Icon';
import { CATEGORIES, PER_PAGE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Widget' };

const href = (o) => {
  const p = new URLSearchParams();
  if (o.cat) p.set('cat', o.cat);
  if (o.q) p.set('q', o.q);
  if (o.page > 1) p.set('page', o.page);
  const s = p.toString();
  return '/widgets' + (s ? '?' + s : '');
};

export default async function Widgets({ searchParams }) {
  const cat = CATEGORIES.some(c => c.id === searchParams.cat) ? searchParams.cat : '';
  const q = (searchParams.q || '').slice(0, 60);
  const page = Math.max(1, parseInt(searchParams.page, 10) || 1);
  const [{ items, total }, stats] = await Promise.all([listWidgets({ page, cat, q }), getStats()]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total ? (page - 1) * PER_PAGE + 1 : 0, to = Math.min(total, page * PER_PAGE);
  return (
    <>
      <div className="page-head">
        <div><h1>Widget</h1><p>{total} widget{cat ? ` di kategori ${cat}` : ''}{q ? ` untuk "${q}"` : ''} · menampilkan {from}–{to}</p></div>
      </div>
      <div className="filters">
        <Link href={href({ q })} className={'fchip' + (!cat ? ' on' : '')}>{!cat && <Icon name="check" size={16} />}Semua <span className="count">{stats.total}</span></Link>
        {CATEGORIES.map(c => <Link key={c.id} href={href({ cat: c.id, q })} title={c.desc} className={'fchip' + (cat === c.id ? ' on' : '')}><Icon name={cat === c.id ? 'check' : CAT_ICON[c.id]} size={16} />{c.label} <span className="count">{stats.perCat[c.id] || 0}</span></Link>)}
        <form className="search" action="/widgets">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <Icon name="search" size={18} />
          <input name="q" defaultValue={q} placeholder="Cari widget…" aria-label="Cari widget" />
          <button className="btn btn-filled btn-sm">Cari</button>
        </form>
      </div>
      {items.length ? <div className="wgrid">{items.map(w => <WidgetCard key={w.slug} w={w} />)}</div> : <div className="card muted">Tidak ada widget yang cocok. <Link href="/widgets">Tampilkan semua</Link></div>}
      {pages > 1 && (
        <nav className="pager" aria-label="Halaman">
          {page > 1 ? <Link href={href({ cat, q, page: page - 1 })}><Icon name="back" size={18} />Sebelumnya</Link> : <span className="off"><Icon name="back" size={18} />Sebelumnya</span>}
          {Array.from({ length: pages }, (_, i) => i + 1).map(n => (n === page ? <span key={n} className="on">{n}</span> : <Link key={n} href={href({ cat, q, page: n })}>{n}</Link>))}
          {page < pages ? <Link href={href({ cat, q, page: page + 1 })}>Berikutnya<Icon name="arrow" size={18} /></Link> : <span className="off">Berikutnya<Icon name="arrow" size={18} /></span>}
        </nav>
      )}
    </>
  );
}
