// plain text with blank-line paragraphs and "- " bullet lines -> blocks for rendering
export function blocks(text) {
  return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    const lines = b.split('\n');
    if (lines.every(l => /^\s*[-•*]\s+/.test(l))) return { list: lines.map(l => l.replace(/^\s*[-•*]\s+/, '')) };
    const items = lines.filter(l => /^\s*[-•*]\s+/.test(l));
    if (items.length && /^\s*[-•*]\s+/.test(lines[lines.length - 1])) {
      const head = lines.slice(0, lines.length - items.length).join(' ');
      return { p: head, list: items.map(l => l.replace(/^\s*[-•*]\s+/, '')) };
    }
    return { p: lines.join(' ') };
  });
}
export const excerpt = (t, n = 140) => { const s = String(t || '').replace(/\s+/g, ' ').replace(/(^|\s)[-•*]\s+/g, '$1').trim(); return s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s; };
