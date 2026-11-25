import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { signOut } from '../actions';
async function save(fd: FormData) {
  'use server';
  const sb = createClient(); const { data: w } = await sb.from('workspaces').select('id').single();
  await sb.from('workspaces').update({ name: String(fd.get('name')), description: String(fd.get('description') ?? ''), updated_at: new Date().toISOString() }).eq('id', w!.id);
  revalidatePath('/settings');
}
export default async function Settings() {
  const { sb, member } = await requireMember();
  if (member.role !== 'leader') redirect('/');
  const { data: w } = await sb.from('workspaces').select('name,description,timezone').single();
  return (
    <>
      <PageHeader title="Settings" sub={`Zona waktu: ${w?.timezone}`} />
      <form action={save} className="card max-w-lg space-y-3">
        <div><label className="label" htmlFor="name">Nama workspace</label><input id="name" name="name" defaultValue={w?.name} required className="input" /></div>
        <div><label className="label" htmlFor="description">Deskripsi</label><textarea id="description" name="description" defaultValue={w?.description ?? ''} rows={3} className="input py-2" /></div>
        <button className="btn btn-primary">Simpan</button></form>
      <p className="mt-4 max-w-lg text-sm text-muted">Integrasi Google Drive belum tersedia di versi ini.</p>
      <form action={signOut} className="mt-4"><button className="btn">Keluar</button></form>
    </>
  );
}
