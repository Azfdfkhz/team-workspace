import { createHash, randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireMember, isMgr } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, ErrorBanner, fmt } from '@/components/ui';

async function invite(fd: FormData) {
  'use server';
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
  const { data: m } = await sb.from('workspace_members').select('workspace_id').eq('user_id', user!.id).eq('role', 'leader').eq('status', 'active').maybeSingle();
  if (!m) redirect('/team?error=Hanya Leader yang dapat mengundang');
  const email = String(fd.get('email') ?? '').trim().toLowerCase(); const role = fd.get('role') === 'management' ? 'management' : 'member';
  if (!email.includes('@')) redirect('/team?error=Email tidak valid');
  const token = randomBytes(24).toString('hex');   // only the hash is stored (FR-AUTH-05)
  const { error } = await sb.from('workspace_invitations').insert({ workspace_id: m.workspace_id, email, role, invited_by: user!.id,
    token_hash: createHash('sha256').update(token).digest('hex'), expires_at: new Date(Date.now() + 7 * 864e5).toISOString() });
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);
  redirect(`/team?link=${token}`);   // shown once; share it with the invitee
}
async function setRole(userId: string, fd: FormData) {
  'use server';
  const { error } = await createClient().from('workspace_members').update({ role: fd.get('role') === 'management' ? 'management' : 'member' }).eq('user_id', userId);
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`); revalidatePath('/team');
}
async function setStatus(userId: string, status: string) {
  'use server';
  const { error } = await createClient().from('workspace_members').update({ status }).eq('user_id', userId);
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`); revalidatePath('/team');
}
async function transfer(fd: FormData) {
  'use server';
  const { error } = await createClient().rpc('transfer_ownership', { p_new_leader: String(fd.get('to')) });
  if (error) redirect(`/team?error=${encodeURIComponent(error.message)}`);
  redirect('/');
}

export default async function Team({ searchParams }: { searchParams: { error?: string; link?: string } }) {
  const { sb, member, user } = await requireMember();
  if (!isMgr(member.role)) redirect('/');
  const leader = member.role === 'leader';
  const [{ data: members }, { data: invites }] = await Promise.all([
    sb.from('workspace_members').select('user_id,role,status,joined_at,profiles(display_name,email)').order('joined_at'),
    leader ? sb.from('workspace_invitations').select('id,email,role,status,expires_at').order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] as any[] }),
  ]);
  return (
    <>
      <PageHeader title="Team" sub={`${members?.length ?? 0} anggota`} />
      <ErrorBanner msg={searchParams.error} />
      {searchParams.link && <div role="status" className="card mb-4 border-primary text-sm">Tautan undangan (tampil sekali, berlaku 7 hari):<br />
        <code className="break-all">{`/invite/${searchParams.link}`}</code> — tambahkan domain aplikasi di depannya.</div>}
      {leader && <form action={invite} className="card mb-4 flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
        <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" className="input"><option value="member">Member</option><option value="management">Management</option></select></div>
        <button className="btn btn-primary">Buat undangan</button></form>}
      <div className="card divide-y divide-line">{(members ?? []).map((m: any) => (
        <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <div><p className="font-medium">{m.profiles?.display_name}</p><p className="text-xs text-muted">{m.profiles?.email} · bergabung {fmt(m.joined_at)}</p></div>
          <div className="flex items-center gap-2"><span className="text-xs">{m.role} · {m.status}</span>
            {leader && m.role !== 'leader' && <>
              <form action={setRole.bind(null, m.user_id)} className="flex gap-1"><label className="sr-only" htmlFor={`r-${m.user_id}`}>Role</label>
                <select id={`r-${m.user_id}`} name="role" defaultValue={m.role} className="input !min-h-[32px] w-auto"><option value="member">Member</option><option value="management">Management</option></select><button className="btn !min-h-[32px]">Simpan</button></form>
              <form action={setStatus.bind(null, m.user_id, m.status === 'active' ? 'suspended' : 'active')}><button className="btn !min-h-[32px]">{m.status === 'active' ? 'Suspend' : 'Aktifkan'}</button></form></>}
          </div></div>))}</div>
      {leader && invites && invites.length > 0 && <><h2 className="mb-2 mt-6 text-sm font-semibold">Undangan terakhir</h2>
        <div className="card divide-y divide-line text-sm">{invites.map((i: any) => <div key={i.id} className="flex justify-between py-2"><span>{i.email} · {i.role}</span><span className="text-muted">{i.status}</span></div>)}</div></>}
      {leader && <form action={transfer} className="card mt-6 flex flex-wrap items-end gap-2"><div><label className="label" htmlFor="to">Transfer kepemilikan ke</label>
        <select id="to" name="to" required className="input">{(members ?? []).filter((m: any) => m.user_id !== user.id && m.status === 'active').map((m: any) => <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name}</option>)}</select></div>
        <button className="btn">Transfer (Anda menjadi Management)</button></form>}
    </>
  );
}
