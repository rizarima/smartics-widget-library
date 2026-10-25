import { requireAdmin } from '@/lib/admin';
import { allWidgets } from '@/lib/data';
import WidgetAdmin from '@/components/admin/WidgetAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminWidgets() {
  await requireAdmin('/admin/widget');
  const list = (await allWidgets(true)).map(({ properties, description, ...w }) => ({ ...w, description }));
  return <WidgetAdmin widgets={list} />;
}
