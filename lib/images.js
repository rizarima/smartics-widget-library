// uploaded images live in the Supabase Storage bucket "images", one folder per kind
export const BUCKET = 'images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp,.gif,.avif,' + Object.keys(IMAGE_TYPES).join(',');
export const IMAGE_HINT = 'PNG, JPG, SVG, WEBP, GIF atau AVIF, maksimal 5 MB';
const EXT_TYPE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };

export const publicImageUrl = path => path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}` : null;

// the file's real type (some browsers leave file.type empty for svg/avif), or an error text
export function checkImage(file, { svg = true } = {}) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = IMAGE_TYPES[file.type] ? file.type : EXT_TYPE[ext];
  if (!type || (!svg && type === 'image/svg+xml')) return { error: `Format tidak didukung. Pakai ${svg ? IMAGE_HINT : 'PNG, JPG, WEBP, GIF atau AVIF, maksimal 5 MB'}.` };
  if (file.size > MAX_IMAGE_BYTES) return { error: `Ukuran ${(file.size / 1048576).toFixed(1)} MB, maksimal 5 MB.` };
  return { type, ext: IMAGE_TYPES[type] };
}

// browser: upload to <folder>/<time>-<random>.<ext> with the visitor's own session; Storage rules decide who may write
export async function uploadImage(db, folder, file, opts) {
  const c = checkImage(file, opts);
  if (c.error) throw new Error(c.error);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${c.ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: c.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('Upload gagal: ' + error.message);
  return path;
}
