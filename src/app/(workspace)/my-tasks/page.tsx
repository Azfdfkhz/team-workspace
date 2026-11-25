import { requireMember } from '@/lib/auth/session';
import { PageHeader, TaskRow, Empty } from '@/components/ui';
export default async function MyTasks() {
  const { sb, user } = await requireMember();
  const { data } = await sb.from('task_assignees')
    .select('tasks!inner(id,title,status,priority,due_at,archived_at,task_assignees(profiles(display_name)))').eq('user_id', user.id);
  const tasks = (data ?? []).map((r: any) => r.tasks).filter((t: any) => t && !t.archived_at)
    .sort((a: any, b: any) => (a.due_at ?? '9').localeCompare(b.due_at ?? '9'));
  const open = tasks.filter((t: any) => !['completed', 'cancelled'].includes(t.status));
  const done = tasks.filter((t: any) => ['completed', 'cancelled'].includes(t.status));
  return (
    <>
      <PageHeader title="My Tasks" sub={`${open.length} tugas aktif`} />
      <div className="space-y-2">{open.length ? open.map((t: any) => <TaskRow key={t.id} t={t} />) : <Empty>Belum ada tugas untuk Anda.</Empty>}</div>
      {done.length > 0 && <><h2 className="mb-2 mt-6 text-sm font-semibold text-muted">Selesai / dibatalkan</h2>
        <div className="space-y-2">{done.map((t: any) => <TaskRow key={t.id} t={t} />)}</div></>}
    </>
  );
}
