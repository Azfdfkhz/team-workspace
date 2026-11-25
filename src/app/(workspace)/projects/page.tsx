import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireMember, isMgr } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Empty } from '@/components/ui';
async function add(fd: FormData) {
  'use server';
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
  const { data: m } = await sb.from('workspace_members').select('workspace_id').eq('user_id', user!.id).eq('status', 'active').single();
  const name = String(fd.get('name') ?? '').trim(); if (!name) redirect('/projects');
  await sb.from('projects').insert({ workspace_id: m!.workspace_id, name, description: String(fd.get('description') ?? '') || null, created_by: user!.id });
  revalidatePath('/projects');
}
export default async function Projects() {
  const { sb, member } = await requireMember();
  const { data } = await sb.from('projects').select('id,name,description,tasks(status)').order('name');
  return (
    <>
      <PageHeader title="Projects" />
      {isMgr(member.role) && <form action={add} className="card mb-4 flex flex-wrap gap-2"><label className="sr-only" htmlFor="name">Nama project</label>
        <input id="name" name="name" required placeholder="Nama project" className="input max-w-xs" /><label className="sr-only" htmlFor="description">Deskripsi</label>
        <input id="description" name="description" placeholder="Deskripsi (opsional)" className="input max-w-sm" /><button className="btn btn-primary">Tambah</button></form>}
      {!data?.length ? <Empty>Belum ada project.</Empty> : <div className="grid gap-3 md:grid-cols-2">{data.map((p: any) => {
        const ts: any[] = p.tasks ?? []; const d = ts.filter((x) => x.status === 'completed').length;
        return <div key={p.id} className="card"><p className="font-medium">{p.name}</p><p className="text-sm text-muted">{p.description}</p>
          <p className="mt-2 text-xs text-muted">{d}/{ts.length} tugas selesai</p></div>; })}</div>}
    </>
  );
}
