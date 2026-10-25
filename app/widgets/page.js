import Link from 'next/link';
import WidgetCard from '@/components/WidgetCard';
import { listWidgets } from '@/lib/data';
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
  const { items, total } = await listWidgets({ page, cat, q });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total ? (page - 1) * PER_PAGE + 1 : 0, to = Math.min(total, page * PER_PAGE);
  return (
    <>
      <div className="hero">
        <div><h1>Widget</h1><p>{total} widget{cat ? ` di kategori ${cat}` : ''}{q ? ` untuk "${q}"` : ''}. Menampilkan {from}–{to}.</p></div>
      </div>
      <div className="filters">
        <Link href={href({ q })} className={'chip' + (!cat ? ' on' : '')}>Semua</Link>
        {CATEGORIES.map(c => <Link key={c.id} href={href({ cat: c.id, q })} title={c.desc} className={'chip' + (cat === c.id ? ' on' : '')}>{c.label}</Link>)}
        <form className="search" action="/widgets">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input name="q" defaultValue={q} placeholder="Cari widget (valve, tank…)" aria-label="Cari widget" />
          <button className="btn">Cari</button>
        </form>
      </div>
      {items.length ? <div className="wgrid">{items.map(w => <WidgetCard key={w.slug} w={w} />)}</div> : <div className="card muted">Tidak ada widget yang cocok.</div>}
      {pages > 1 && (
        <nav className="pager" aria-label="Halaman">
          {page > 1 ? <Link href={href({ cat, q, page: page - 1 })}>← Sebelumnya</Link> : <span className="off">← Sebelumnya</span>}
          {Array.from({ length: pages }, (_, i) => i + 1).map(n => (n === page ? <span key={n} className="on">{n}</span> : <Link key={n} href={href({ cat, q, page: n })}>{n}</Link>))}
          {page < pages ? <Link href={href({ cat, q, page: page + 1 })}>Berikutnya →</Link> : <span className="off">Berikutnya →</span>}
        </nav>
      )}
    </>
  );
}
