'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
export async function createWorkspace(fd: FormData) {
  const name = String(fd.get('name') ?? '').trim();
  if (!name) redirect('/?error=Nama workspace wajib diisi');
  const { error } = await createClient().rpc('create_workspace', { p_name: name });
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  redirect('/');
}
export async function signOut() { await createClient().auth.signOut(); redirect('/login'); }
export async function markAllRead() {
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user!.id).is('read_at', null);
  revalidatePath('/notifications');
}
