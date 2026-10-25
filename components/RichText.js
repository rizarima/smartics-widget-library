import { blocks } from '@/lib/text';

export default function RichText({ text }) {
  return (
    <div className="content">
      {blocks(text).map((b, i) => (
        <div key={i}>
          {b.p && <p>{b.p}</p>}
          {b.list && <ul>{b.list.map((l, j) => <li key={j}>{l}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
}
