import Link from 'next/link';

const isNew = d => Date.now() - new Date(d).getTime() < 14 * 864e5;

export default function WidgetCard({ w }) {
  return (
    <Link href={`/widgets/${w.slug}`} className="wcard">
      {isNew(w.created_at) && <span className="badge-new">BARU</span>}
      <div className="wthumb"><img src={w.thumb} alt={w.name} loading="lazy" /></div>
      <div className="wbody">
        <b>{w.name}</b>
        <span className="muted small">{w.kind}</span>
        <div className="chips">
          {w.categories.slice(0, 2).map(c => <span key={c} className="chip">{c}</span>)}
          <span className={'chip t' + ((w.template || '').match(/Template (\d)/)?.[1] || '1')}>{(w.template || '').split(' - ')[0]}</span>
        </div>
      </div>
    </Link>
  );
}
