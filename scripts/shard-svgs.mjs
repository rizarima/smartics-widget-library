// Splits data/widget-svgs.json (one 11 MB file) into N smaller shards so the server
// only loads the shard containing the requested widget, instead of all 306 SVGs.
// Run this again whenever data/widget-svgs.json changes (after scripts/build-data.py).
import fs from 'fs';
const N = 16;
const SRC = 'data/widget-svgs.json';
const OUT = 'data/svg-shards';

function shardKey(slug) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % N;
}

const svgs = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const shards = Array.from({ length: N }, () => ({}));
for (const [slug, svg] of Object.entries(svgs)) shards[shardKey(slug)][slug] = svg;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
shards.forEach((obj, i) => fs.writeFileSync(`${OUT}/shard-${i}.json`, JSON.stringify(obj)));

const sizes = shards.map((s, i) => fs.statSync(`${OUT}/shard-${i}.json`).size);
console.log(`Wrote ${N} shards for ${Object.keys(svgs).length} widgets.`);
console.log(`Largest shard: ${(Math.max(...sizes) / 1024).toFixed(0)} KB (was ${(fs.statSync(SRC).size / 1024).toFixed(0)} KB in one file)`);
