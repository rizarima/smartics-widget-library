import { requireAdmin } from '@/lib/admin';
import { allWidgets } from '@/lib/data';
import WidgetAdmin from '@/components/admin/WidgetAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminWidgets() {
  const { user } = await requireAdmin('/admin/widget');
  const list = (await allWidgets(true)).map(({ properties, ...w }) => w);
  return <WidgetAdmin widgets={list} me={user.id} />;
}
