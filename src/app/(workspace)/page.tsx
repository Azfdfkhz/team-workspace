import Link from 'next/link';
import { requireMember, isMgr } from '@/lib/auth/session';
import { PageHeader, TaskRow, Empty, ErrorBanner, arr, isOverdue } from '@/components/ui';
export default async function Dashboard({ searchParams }: { searchParams: { error?: string } }) {
  const { sb, user, member } = await requireMember();
  const mgr = isMgr(member.role);
  const { data } = await sb.from('tasks').select('id,title,status,priority,due_at,task_assignees(user_id,profiles(display_name))')
    .is('archived_at', null).order('due_at', { ascending: true, nullsFirst: false }).limit(500);
  const all: any[] = data ?? [];
  const mine = all.filter((t) => arr<any>(t.task_assignees).some((a) => a.user_id === user.id));
  const base = mgr ? all : mine;
  const active = base.filter((t) => !['completed', 'cancelled'].includes(t.status));
  const soon = active.filter((t) => t.due_at && !isOverdue(t) && new Date(t.due_at).getTime() - Date.now() < 3 * 864e5);
  const stats: [string, number, string][] = mgr
    ? [['Tugas aktif', active.length, '/tasks'], ['Menunggu review', all.filter((t) => t.status === 'in_review').length, '/tasks?status=in_review'],
       ['Terlambat', all.filter(isOverdue).length, '/tasks?due=overdue'], ['Butuh revisi', all.filter((t) => t.status === 'revision').length, '/tasks?status=revision']]
    : [['Tugas saya', active.length, '/my-tasks'], ['Dikerjakan', mine.filter((t) => t.status === 'in_progress').length, '/my-tasks'],
       ['Perlu revisi', mine.filter((t) => t.status === 'revision').length, '/my-tasks'], ['Terlambat', mine.filter(isOverdue).length, '/my-tasks']];
  const load: Record<string, number> = {};
  if (mgr) active.forEach((t) => arr<any>(t.task_assignees).forEach((a) => { const n = a.profiles?.display_name ?? '?'; load[n] = (load[n] ?? 0) + 1; }));
  return (
    <>
      <PageHeader title="Overview" sub={mgr ? 'Ringkasan workspace' : 'Ringkasan tugas Anda'} />
      <ErrorBanner msg={searchParams.error} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, n, h]) => <Link key={l} href={h} className="card hover:border-primary"><p className="text-2xl font-semibold">{n}</p><p className="text-xs text-muted">{l}</p></Link>)}
      </div>
      <h2 className="mb-2 text-sm font-semibold">Deadline terdekat</h2>
      <div className="space-y-2">{soon.length ? soon.slice(0, 6).map((t) => <TaskRow key={t.id} t={t} />) : <Empty>Tidak ada deadline dalam 3 hari.</Empty>}</div>
      {mgr && <>
        <h2 className="mb-2 mt-6 text-sm font-semibold">Beban kerja anggota</h2>
        <div className="card divide-y divide-line">
          {Object.entries(load).length ? Object.entries(load).sort((a, b) => b[1] - a[1]).map(([n, c]) =>
            <div key={n} className="flex justify-between py-2 text-sm"><span>{n}</span><span className="text-muted">{c} tugas aktif</span></div>) : <p className="py-2 text-sm text-muted">Belum ada penugasan.</p>}
        </div></>}
    </>
  );
}
