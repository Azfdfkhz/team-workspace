import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMember, isMgr } from '@/lib/auth/session';
import { PageHeader, TaskRow, Empty, STATUS, PRIORITY, StatusBadge } from '@/components/ui';
export default async function AllTasks({ searchParams: q }: { searchParams: Record<string, string | undefined> }) {
  const { sb, member } = await requireMember();
  if (!isMgr(member.role)) redirect('/my-tasks');
  let query = sb.from('tasks').select(`id,title,status,priority,due_at,project_id,task_assignees${q.assignee ? '!inner' : ''}(user_id,profiles(display_name))`).is('archived_at', null);
  if (q.status) query = query.eq('status', q.status);
  if (q.priority) query = query.eq('priority', q.priority);
  if (q.project) query = query.eq('project_id', q.project);
  if (q.assignee) query = query.eq('task_assignees.user_id', q.assignee);
  if (q.q) query = query.ilike('title', `%${q.q.replace(/[%,]/g, ' ')}%`);
  if (q.due === 'overdue') query = query.lt('due_at', new Date().toISOString()).not('status', 'in', '(completed,cancelled)');
  const [{ data }, { data: projects }, { data: members }] = await Promise.all([
    query.order('due_at', { ascending: true, nullsFirst: false }).limit(200),
    sb.from('projects').select('id,name').order('name'),
    sb.from('workspace_members').select('user_id,profiles(display_name)').eq('status', 'active'),
  ]);
  const tasks: any[] = data ?? [];
  const board = q.view === 'board';
  const keep = (v: string) => new URLSearchParams(Object.entries({ ...q, view: v }).filter(([, x]) => x) as [string, string][]).toString();
  return (
    <>
      <PageHeader title="All Tasks" sub={`${tasks.length} tugas`} action={<Link className="btn btn-primary" href="/tasks/new">+ Buat tugas</Link>} />
      <form className="card mb-4 grid grid-cols-2 gap-3 md:grid-cols-6" role="search">
        <input type="hidden" name="view" value={board ? 'board' : 'list'} />
        <div className="col-span-2"><label className="label" htmlFor="q">Cari judul</label><input id="q" name="q" defaultValue={q.q} className="input" /></div>
        <div><label className="label" htmlFor="status">Status</label><select id="status" name="status" defaultValue={q.status ?? ''} className="input"><option value="">Semua</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="label" htmlFor="priority">Prioritas</label><select id="priority" name="priority" defaultValue={q.priority ?? ''} className="input"><option value="">Semua</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="project">Project</label><select id="project" name="project" defaultValue={q.project ?? ''} className="input"><option value="">Semua</option>
          {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="label" htmlFor="assignee">Assignee</label><select id="assignee" name="assignee" defaultValue={q.assignee ?? ''} className="input"><option value="">Semua</option>
          {(members ?? []).map((m: any) => <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name}</option>)}</select></div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-6"><button className="btn btn-primary">Terapkan</button><Link className="btn" href="/tasks">Reset</Link>
          <span className="ml-auto flex gap-1"><Link className="btn" aria-current={!board} href={`/tasks?${keep('list')}`}>List</Link><Link className="btn" aria-current={board} href={`/tasks?${keep('board')}`}>Board</Link></span></div>
      </form>
      {!tasks.length ? <Empty>Tidak ada tugas yang cocok.</Empty> : board ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.keys(STATUS).map((s) => (
            <section key={s} className="w-64 shrink-0" aria-label={STATUS[s].label}>
              <div className="mb-2 flex items-center justify-between"><StatusBadge s={s} /><span className="text-xs text-muted">{tasks.filter((t) => t.status === s).length}</span></div>
              <div className="space-y-2">{tasks.filter((t) => t.status === s).map((t) => <Link key={t.id} href={`/tasks/${t.id}`} className="card block text-sm hover:border-primary">{t.title}</Link>)}</div>
            </section>))}
        </div>
      ) : <div className="space-y-2">{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</div>}
    </>
  );
}
