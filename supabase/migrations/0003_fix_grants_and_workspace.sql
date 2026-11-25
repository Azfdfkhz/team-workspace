-- FIX 1: helper functions used inside RLS policies must be executable by `authenticated`.
-- 0001 revoked EXECUTE on all functions from PUBLIC, so every RLS check failed with "permission denied for function".
-- Result: workspace_members could not be read, so the app thought you had no workspace.
grant execute on function is_active_member(uuid), has_role(uuid, member_role[]), is_task_assignee(uuid),
  can_view_task(uuid), task_transition_allowed(task_status, task_status) to authenticated;

-- FIX 2: users who signed up before the profile trigger existed have no profiles row (FK error on workspaces.created_by).
insert into profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email,'@',1)) from auth.users on conflict (id) do nothing;

create or replace function create_workspace(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid; u record;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into profiles (id, email, display_name) values (u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)))
    on conflict (id) do nothing;
  if exists (select 1 from workspace_members where user_id = auth.uid() and status = 'active') then
    raise exception 'Anda sudah menjadi anggota sebuah workspace'; end if;
  if exists (select 1 from workspaces) then
    raise exception 'Workspace sudah ada (MVP satu workspace). Minta tautan undangan dari Leader.'; end if;
  insert into workspaces (name, created_by) values (p_name, auth.uid()) returning id into ws;
  insert into workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'leader');
  perform _log(ws, 'workspace.created', 'workspace', ws);
  return ws; end $$;

-- FIX 3: digest() lives in the `extensions` schema on Supabase.
create or replace function accept_invitation(p_token text) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare inv workspace_invitations; u record;
begin
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into profiles (id, email, display_name) values (u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)))
    on conflict (id) do nothing;
  select * into inv from workspace_invitations where token_hash = encode(digest(p_token,'sha256'),'hex') for update;
  if not found or inv.status <> 'pending' or inv.expires_at < now() then raise exception 'Invalid or expired invitation'; end if;
  if lower(inv.email) <> lower(auth.jwt()->>'email') then raise exception 'Invitation was issued to a different email'; end if;
  insert into workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role, status = 'active';
  update workspace_invitations set status='accepted', accepted_by=auth.uid(), accepted_at=now() where id = inv.id;
  perform _log(inv.workspace_id, 'invitation.accepted', 'invitation', inv.id); return inv.workspace_id; end $$;
