import 'server-only';
import crypto from 'crypto';

// secret used to sign watermark IDs so a partner can't forge or edit one themselves.
// Set WATERMARK_SECRET in Vercel env (any long random string). Falls back to a dev-only value locally.
const SECRET = process.env.WATERMARK_SECRET || 'dev-only-insecure-secret-change-me';
export const hasWatermarkSecret = !!process.env.WATERMARK_SECRET;

// one unique ID per build, e.g. SWL-261115-A9F8B2C
export function genWatermarkId() {
  const d = new Date();
  const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
  return `SWL-${ymd}-${rand}`;
}

// one unique ID per partner account, e.g. PTR-7F3A1C9B
export function genPartnerUniqueId() {
  return 'PTR-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

function hmac(id) {
  return crypto.createHmac('sha256', SECRET).update(id).digest('hex').slice(0, 20);
}

// signs the build's watermark_id into a short token that's embedded in each SVG.
// token = base64url("<id>.<hmac>") - tamper with either half and verify() fails.
export function signWatermark(id) {
  return Buffer.from(`${id}.${hmac(id)}`).toString('base64url');
}

// decodes+verifies a token found inside an SVG; returns the watermark_id or null if invalid/forged.
export function verifyWatermark(token) {
  try {
    const raw = Buffer.from(String(token), 'base64url').toString('utf8');
    const i = raw.lastIndexOf('.');
    if (i < 0) return null;
    const id = raw.slice(0, i), sig = raw.slice(i + 1);
    const expected = hmac(id);
    // timing-safe compare
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return id;
  } catch { return null; }
}

// inserts the signed token into an SVG string as a hidden metadata tag (not visible, not plain "id=" text).
export function embedWatermark(svg, token) {
  const tag = `<metadata xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:RDF><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier>${token}</dc:identifier></rdf:Description></rdf:RDF></metadata>`;
  const m = svg.match(/<svg\b[^>]*>/i);
  if (!m) return svg; // not a real SVG; leave untouched, caller should have validated already
  const idx = m.index + m[0].length;
  return svg.slice(0, idx) + tag + svg.slice(idx);
}

// extracts a watermark token from an uploaded/suspect SVG, trying both known insertion spots.
export function extractWatermarkToken(svg) {
  const m1 = svg.match(/<dc:identifier>([^<]+)<\/dc:identifier>/i);
  if (m1) return m1[1].trim();
  const m2 = svg.match(/data-swl-auth="([^"]+)"/i);
  if (m2) return m2[1].trim();
  return null;
}

// minify: strip comments, collapse whitespace/newlines into a single-line string (basic obfuscation, no external dep)
export function minifySvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\r\n\t]+/g, '')
    .trim();
}

// full pipeline for one widget: sign -> embed -> minify
export function watermarkSvg(svg, watermarkId) {
  return minifySvg(embedWatermark(svg, signWatermark(watermarkId)));
}
