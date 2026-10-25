import { getCurrentUser } from '@/lib/supabase-server';
import { sendWhatsApp, adminPhone } from '@/lib/whatsapp';

// tells the admin on WhatsApp that a new partner is waiting (only with a WhatsApp gateway configured)
export async function POST(req) {
  const u = await getCurrentUser();
  if (!u || u.role !== 'partner' || u.status !== 'pending') return Response.json({ ok: false });
  const origin = new URL(req.url).origin;
  const sent = await sendWhatsApp(adminPhone(), `Pendaftaran partner baru di SmartICS Widget Library:\n${u.name} (${u.company})\n${u.email} · ${u.phone}\n\nSetujui di ${origin}/admin/partner`);
  return Response.json({ ok: true, sent });
}
