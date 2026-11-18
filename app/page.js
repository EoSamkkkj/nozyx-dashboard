import { requireAuth, USER } from '@/lib/auth';
import { hasDatabase, loadData } from '@/lib/db';
import App from '@/components/App';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const role = await requireAuth();
  const data = await loadData(USER);
  return <App role={role} initial={data} storage={hasDatabase ? 'banco' : 'memoria'} />;
}
