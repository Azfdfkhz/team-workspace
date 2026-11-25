'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
export type SetupState = { error: string };
export async function createWorkspace(_prev: SetupState, fd: FormData): Promise<SetupState> {
  const name = String(fd.get('name') ?? '').trim();
  if (!name) return { error: 'Nama workspace wajib diisi' };
  const { error } = await createClient().rpc('create_workspace', { p_name: name });
  if (error) return { error: error.message };
  redirect('/');
}
export async function signOut() { await createClient().auth.signOut(); redirect('/login'); }
export async function markAllRead() {
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
  await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user!.id).is('read_at', null);
  revalidatePath('/notifications');
}
