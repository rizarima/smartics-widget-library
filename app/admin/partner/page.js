import { requireAdmin } from '@/lib/admin';
import PartnerTable from '@/components/admin/PartnerTable';
import { hasServiceKey } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function Partners() {
  const { db, user } = await requireAdmin('/admin/partner');
  const { data } = await db.from('profiles').select('id, email, full_name, company, phone, role, status, created_at, approved_at').order('created_at', { ascending: false });
  const rows = (data || []).sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? 0 : a.status === 'pending' ? -1 : 1);
  return (
    <>
      <div className="page-head"><div><h1>User & peran</h1><p>Tambah user, atur peran (partner, member, admin), dan setujui pendaftaran partner. Partner yang disetujui mendapat notifikasi WhatsApp dan bisa mengunduh widget.</p></div></div>
      <PartnerTable rows={rows} gateway={!!process.env.FONNTE_TOKEN} canManage={hasServiceKey} me={user.id} />
    </>
  );
}
