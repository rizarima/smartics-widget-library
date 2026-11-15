import 'server-only';

// Vercel injects these headers on every request in production (no external API/key needed).
// On localhost / other hosts they're simply absent, so both values come back null there.
export function geoFromHeaders(headers) {
  const country = headers.get('x-vercel-ip-country');
  const cityRaw = headers.get('x-vercel-ip-city');
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;
  return { country: country || null, city: city || null };
}
