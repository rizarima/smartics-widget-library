import { requireAdmin } from '@/lib/admin';
import TraceVerify from '@/components/admin/TraceVerify';

export const dynamic = 'force-dynamic';

export default async function AdminTrace() {
  await requireAdmin('/admin/trace');
  return <TraceVerify />;
}
