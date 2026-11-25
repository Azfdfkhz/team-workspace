import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export const isMgr = (r?: string) => r === 'leader' || r === 'management';
/** Authenticated context. Authorization itself is enforced by RLS/RPCs; this only shapes the UI. */
export async function getCtx() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const { data: member, error } = await sb.from('workspace_members')
    .select('workspace_id, role, workspaces(name)').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  // Do not mistake a failed query (e.g. missing grants) for "no workspace yet".
  if (error) throw new Error(`Gagal membaca keanggotaan workspace: ${error.message}`);
  return { sb, user, member: member as any };
}
export async function requireMember() {
  const c = await getCtx();
  if (!c.member) redirect('/');
  return c as typeof c & { member: any };
}
