import Link from 'next/link';

export default function WidgetCard({ w }) {
  return (
    <Link href={`/widgets/${w.slug}`} className="wcard">
      <div className="wthumb"><img src={`/previews/${w.slug}.svg`} alt={w.name} loading="lazy" /></div>
      <div className="wbody">
        <b>{w.name}</b>
        <span className="muted small">{w.kind}</span>
        <div className="chips">
          {w.categories.map(c => <span key={c} className="chip">{c}</span>)}
          <span className={'chip' + (w.template.startsWith('Template 2') ? ' t2' : '')}>{w.template.split(' - ')[0]}</span>
        </div>
      </div>
    </Link>
  );
}
