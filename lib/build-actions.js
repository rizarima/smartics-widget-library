'use server';
import JSZip from 'jszip';
import { supabaseServer, getCurrentUser } from './supabase-server';
import { isAdminRole } from './roles';
import { getBundledSvg } from './data';
import { genWatermarkId, genPartnerUniqueId, watermarkSvg, hasWatermarkSecret } from './watermark';
import { audit } from './audit';
import { BUILD_BUCKET, BATCH_SIZE, RETENTION_DAYS } from './build-config';

async function admin() {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) throw new Error('Khusus admin');
  return { db: supabaseServer(), me };
}
const fail = e => ({ ok: false, error: e?.message || String(e) });

// ---------- partners ----------
export async function listPartnersForBuild() {
  try {
    const { db } = await admin();
    const { data, error } = await db.from('profiles').select('id, full_name, email, company, status, partner_unique_id').eq('role', 'partner').order('full_name');
    if (error) throw error;
    return { ok: true, partners: data || [] };
  } catch (e) { return fail(e); }
}

async function ensurePartnerUniqueId(db, partnerId) {
  const { data, error } = await db.from('profiles').select('partner_unique_id').eq('id', partnerId).maybeSingle();
  if (error) throw error;
  if (data?.partner_unique_id) return data.partner_unique_id;
  const id = genPartnerUniqueId();
  const { error: e2 } = await db.from('profiles').update({ partner_unique_id: id }).eq('id', partnerId);
  if (e2) throw e2;
  return id;
}

// svg source: database row (uploaded/edited) first, then the bundled master file
async function getSourceSvg(db, slug) {
  const { data } = await db.from('widgets').select('svg').eq('slug', slug).maybeSingle();
  if (data?.svg) return data.svg;
  return await getBundledSvg(slug);
}

// ---------- build lifecycle ----------

// step 1: create the build row (status 'building') and return how many batches the client should run
export async function startBuild({ partnerId, packageName, widgetSlugs }) {
  try {
    const { db, me } = await admin();
    if (!hasWatermarkSecret) throw new Error('WATERMARK_SECRET belum diisi di Vercel env — set dulu sebelum build (lihat catatan di bawah tombol).');
    if (!partnerId) throw new Error('Pilih partner dulu.');
    const slugs = [...new Set(widgetSlugs || [])];
    if (!slugs.length) throw new Error('Pilih minimal 1 widget.');
    const { data: partner, error: pe } = await db.from('profiles').select('full_name, email, role, status').eq('id', partnerId).maybeSingle();
    if (pe) throw pe;
    if (!partner || partner.role !== 'partner') throw new Error('Akun yang dipilih bukan partner.');
    const partnerUniqueId = await ensurePartnerUniqueId(db, partnerId);
    const watermarkId = genWatermarkId();
    const totalBatches = Math.ceil(slugs.length / BATCH_SIZE);
    const { data: row, error } = await db.from('widget_builds').insert({
      partner_id: partnerId, partner_name: partner.full_name || partner.email, partner_unique_id: partnerUniqueId,
      package_name: packageName || null, widget_slugs: slugs, widget_count: slugs.length,
      status: 'building', total_batches: totalBatches, completed_batches: 0, watermark_id: watermarkId,
      built_by: me.id, built_by_name: me.name,
    }).select('id').single();
    if (error) throw error;
    await audit(db, me, 'build.start', 'widget_builds', row.id, `${partner.full_name || partner.email} - ${slugs.length} widget`);
    return { ok: true, buildId: row.id, totalBatches, watermarkId };
  } catch (e) { return fail(e); }
}

// step 2: process one batch (watermark + minify + upload each SVG as a temp file); call once per batch in order
export async function runBuildBatch(buildId, batchIndex) {
  try {
    const { db, me } = await admin();
    const { data: build, error } = await db.from('widget_builds').select('*').eq('id', buildId).maybeSingle();
    if (error) throw error;
    if (!build) throw new Error('Build tidak ditemukan.');
    if (build.status === 'failed') throw new Error(build.error_message || 'Build sebelumnya gagal.');
    if (build.status === 'done') return { ok: true, done: true, completedBatches: build.total_batches, totalBatches: build.total_batches, zipPath: build.zip_path };

    const slugs = build.widget_slugs.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
    if (!slugs.length) throw new Error('Batch kosong (index di luar jangkauan).');

    for (const slug of slugs) {
      const svg = await getSourceSvg(db, slug);
      if (!svg) continue; // widget dihapus setelah build dimulai; dilewati
      const watermarked = watermarkSvg(svg, build.watermark_id);
      const { error: ue } = await db.storage.from(BUILD_BUCKET).upload(`tmp/${buildId}/${slug}.svg`, new Blob([watermarked], { type: 'image/svg+xml' }), { contentType: 'image/svg+xml', upsert: true });
      if (ue) throw new Error(`Upload ${slug} gagal: ${ue.message}`);
    }

    const completedBatches = batchIndex + 1;
    const { error: ue2 } = await db.from('widget_builds').update({ completed_batches: completedBatches }).eq('id', buildId);
    if (ue2) throw ue2;

    if (completedBatches >= build.total_batches) {
      return await finalizeBuild(db, me, { ...build, completed_batches: completedBatches });
    }
    return { ok: true, done: false, completedBatches, totalBatches: build.total_batches };
  } catch (e) {
    await supabaseServer()?.from('widget_builds').update({ status: 'failed', error_message: e?.message || String(e) }).eq('id', buildId);
    return fail(e);
  }
}

// step 3 (internal, called automatically after the last batch): zip all temp files, upload, clean up temp files
async function finalizeBuild(db, me, build) {
  const zip = new JSZip();
  let found = 0;
  for (const slug of build.widget_slugs) {
    const { data, error } = await db.storage.from(BUILD_BUCKET).download(`tmp/${build.id}/${slug}.svg`);
    if (error || !data) continue; // widget was skipped during batching (deleted mid-build)
    zip.file(`${slug}.svg`, await data.arrayBuffer());
    found++;
  }
  const blob = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const zipPath = `builds/build_${build.id}_${build.watermark_id}.zip`;
  const { error: ze } = await db.storage.from(BUILD_BUCKET).upload(zipPath, blob, { contentType: 'application/zip', upsert: true });
  if (ze) throw new Error('Gagal membuat ZIP: ' + ze.message);

  // clean up the per-widget temp files now that they're bundled in the zip
  const tmpPaths = build.widget_slugs.map(s => `tmp/${build.id}/${s}.svg`);
  await db.storage.from(BUILD_BUCKET).remove(tmpPaths);

  const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString();
  await db.from('widget_builds').update({ status: 'done', zip_path: zipPath, zip_expires_at: expiresAt }).eq('id', build.id);
  await audit(db, me, 'build.done', 'widget_builds', build.id, `${build.partner_name} - ${found}/${build.widget_count} widget ter-zip`);
  return { ok: true, done: true, completedBatches: build.total_batches, totalBatches: build.total_batches, zipPath };
}

// a signed, time-limited download link (bucket is private)
export async function getBuildDownloadUrl(buildId) {
  try {
    const { db } = await admin();
    const { data: build, error } = await db.from('widget_builds').select('zip_path, status, zip_expires_at').eq('id', buildId).maybeSingle();
    if (error) throw error;
    if (!build?.zip_path) throw new Error('ZIP belum siap.');
    if (build.zip_expires_at && new Date(build.zip_expires_at) < new Date()) throw new Error('ZIP sudah dihapus otomatis (lewat 2 hari). Build ulang untuk mengunduh lagi.');
    const { data, error: se } = await db.storage.from(BUILD_BUCKET).createSignedUrl(build.zip_path, 600);
    if (se) throw se;
    return { ok: true, url: data.signedUrl };
  } catch (e) { return fail(e); }
}

export async function getBuildStatus(buildId) {
  try {
    const { db } = await admin();
    const { data, error } = await db.from('widget_builds').select('status, completed_batches, total_batches, error_message, zip_path').eq('id', buildId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Build tidak ditemukan.');
    return { ok: true, ...data };
  } catch (e) { return fail(e); }
}

// ---------- history ----------
export async function listBuilds() {
  try {
    const { db } = await admin();
    const { data, error } = await db.from('widget_builds').select('id, partner_name, partner_unique_id, package_name, widget_count, widget_slugs, status, watermark_id, zip_path, zip_expires_at, built_by_name, built_at').order('built_at', { ascending: false }).limit(100);
    if (error) throw error;
    return { ok: true, builds: data || [] };
  } catch (e) { return fail(e); }
}

// repeat a past build (new watermark_id + new zip, same partner/widget list) - used when the old ZIP already expired
export async function rebuildFromHistory(oldBuildId) {
  try {
    const { db } = await admin();
    const { data: old, error } = await db.from('widget_builds').select('partner_id, package_name, widget_slugs').eq('id', oldBuildId).maybeSingle();
    if (error) throw error;
    if (!old) throw new Error('Riwayat build tidak ditemukan.');
    return await startBuild({ partnerId: old.partner_id, packageName: old.package_name, widgetSlugs: old.widget_slugs });
  } catch (e) { return fail(e); }
}

// ---------- verify (Trace & Verify tool) ----------
export async function traceWatermark(svgText) {
  try {
    await admin();
    const { extractWatermarkToken, verifyWatermark } = await import('./watermark');
    const token = extractWatermarkToken(svgText);
    if (!token) return { ok: true, found: false };
    const watermarkId = verifyWatermark(token);
    if (!watermarkId) return { ok: true, found: true, valid: false };
    const db = supabaseServer();
    const { data: build, error } = await db.from('widget_builds').select('id, partner_name, partner_unique_id, package_name, widget_count, built_at, built_by_name').eq('watermark_id', watermarkId).maybeSingle();
    if (error) throw error;
    if (!build) return { ok: true, found: true, valid: true, matched: false, watermarkId };
    return { ok: true, found: true, valid: true, matched: true, watermarkId, build };
  } catch (e) { return fail(e); }
}
