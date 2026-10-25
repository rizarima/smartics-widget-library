import 'server-only';
import { WHATSAPP } from './site';

// 0878… / +62878… -> 62878…
export const waNumber = p => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? '62' + d.slice(1) : d; };
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

// automatic sending needs a WhatsApp gateway; Fonnte (fonnte.com) is used when FONNTE_TOKEN is set
export async function sendWhatsApp(phone, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token || !waNumber(phone)) return false;
  try {
    const r = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: token }, body: new URLSearchParams({ target: waNumber(phone), message, countryCode: '62' }) });
    const j = await r.json().catch(() => ({}));
    return r.ok && j.status !== false;
  } catch { return false; }
}

export const adminPhone = () => process.env.ADMIN_WHATSAPP || WHATSAPP;
