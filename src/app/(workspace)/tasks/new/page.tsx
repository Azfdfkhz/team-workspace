import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireMember, isMgr } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PRIORITY, ErrorBanner } from '@/components/ui';
const schema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due: z.string().optional(), project: z.string().uuid().optional(),
});
async function create(fd: FormData) {
  'use server';
  const p = schema.safeParse({ title: fd.get('title'), description: fd.get('description') || undefined, priority: fd.get('priority'),
    due: fd.get('due') || undefined, project: fd.get('project') || undefined });
  if (!p.success) redirect(`/tasks/new?error=${encodeURIComponent(p.error.issues[0].message)}`);
  const checklist = String(fd.get('checklist') ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  const { data, error } = await createClient().rpc('create_task', {
    p_title: p.data.title, p_description: p.data.description ?? null, p_priority: p.data.priority,
    p_due: p.data.due ? new Date(p.data.due).toISOString() : null, p_project: p.data.project ?? null,
    p_assignees: fd.getAll('assignees').map(String), p_checklist: checklist });
  if (error) redirect(`/tasks/new?error=${encodeURIComponent(error.message)}`);
  redirect(`/tasks/${data}`);
}
export default async function NewTask({ searchParams }: { searchParams: { error?: string } }) {
  const { sb, member } = await requireMember();
  if (!isMgr(member.role)) redirect('/my-tasks');
  const [{ data: members }, { data: projects }] = await Promise.all([
    sb.from('workspace_members').select('user_id,profiles(display_name,email)').eq('role', 'member').eq('status', 'active'),
    sb.from('projects').select('id,name').order('name')]);
  return (
    <>
      <PageHeader title="Buat tugas" />
      <ErrorBanner msg={searchParams.error} />
      <form action={create} className="card max-w-2xl space-y-4">
        <div><label className="label" htmlFor="title">Judul *</label><input id="title" name="title" required className="input" /></div>
        <div><label className="label" htmlFor="description">Deskripsi / brief</label><textarea id="description" name="description" rows={4} className="input py-2" /></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div><label className="label" htmlFor="priority">Prioritas</label><select id="priority" name="priority" defaultValue="medium" className="input">
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="due">Deadline</label><input id="due" name="due" type="datetime-local" className="input" /></div>
          <div><label className="label" htmlFor="project">Project</label><select id="project" name="project" className="input"><option value="">Tanpa project</option>
            {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <fieldset><legend className="label">Assignee (pilih satu atau lebih)</legend>
          <div className="grid gap-1 md:grid-cols-2">{(members ?? []).map((m: any) => (
            <label key={m.user_id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assignees" value={m.user_id} />{m.profiles?.display_name} <span className="text-muted">{m.profiles?.email}</span></label>))}
            {!members?.length && <p className="text-sm text-muted">Belum ada Member. Undang dari halaman Team.</p>}</div></fieldset>
        <div><label className="label" htmlFor="checklist">Checklist (satu item per baris)</label><textarea id="checklist" name="checklist" rows={3} className="input py-2" /></div>
        <button className="btn btn-primary">Simpan tugas</button>
      </form>
    </>
  );
}
