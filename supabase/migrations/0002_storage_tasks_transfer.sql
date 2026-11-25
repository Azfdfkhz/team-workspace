-- Private storage bucket; path convention: <workspace_id>/<task_id>/<uuid>-<filename>
insert into storage.buckets (id, name, public, file_size_limit) values ('task-files','task-files',false,10485760) on conflict (id) do nothing;
create policy task_files_read on storage.objects for select
  using (bucket_id = 'task-files' and can_view_task(((storage.foldername(name))[2])::uuid));
create policy task_files_insert on storage.objects for insert
  with check (bucket_id = 'task-files' and can_view_task(((storage.foldername(name))[2])::uuid));

create function create_task(p_title text, p_description text, p_priority task_priority, p_due timestamptz,
  p_project uuid, p_assignees uuid[], p_checklist text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid; tid uuid; u uuid; i text; pos int := 0;
begin
  select workspace_id into ws from workspace_members where user_id = auth.uid() and status = 'active' and role in ('leader','management') limit 1;
  if ws is null then raise exception 'Not allowed'; end if;
  insert into tasks (workspace_id, title, description, priority, due_at, project_id, created_by, status)
  values (ws, p_title, p_description, p_priority, p_due, p_project, auth.uid(),
    case when coalesce(array_length(p_assignees,1),0) > 0 then 'todo'::task_status else 'not_started'::task_status end) returning id into tid;
  foreach u in array coalesce(p_assignees, '{}'::uuid[]) loop
    insert into task_assignees (workspace_id, task_id, user_id, assigned_by) values (ws, tid, u, auth.uid());
    perform _notify(ws, u, 'task.assigned', 'Tugas baru: ' || p_title, tid);
  end loop;
  foreach i in array coalesce(p_checklist, '{}'::text[]) loop
    pos := pos + 1; insert into task_checklist_items (workspace_id, task_id, title, position) values (ws, tid, i, pos);
  end loop;
  perform _log(ws, 'task.created', 'task', tid, jsonb_build_object('assignees', coalesce(array_length(p_assignees,1),0)));
  return tid; end $$;

-- Ownership transfer (PRD FR-WS-07): the only path allowed to bypass the last-leader guard.
create or replace function guard_last_leader() returns trigger language plpgsql as $$
begin
  if current_setting('app.transfer', true) = 'on' then return coalesce(new, old); end if;
  if old.role = 'leader' and old.status = 'active' and (tg_op = 'DELETE' or new.role <> 'leader' or new.status <> 'active') then
    raise exception 'Cannot remove or demote the last active Leader'; end if;
  return coalesce(new, old); end $$;

create function transfer_ownership(p_new_leader uuid) returns void language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  select workspace_id into ws from workspace_members where user_id = auth.uid() and role = 'leader' and status = 'active';
  if ws is null then raise exception 'Only the Leader can transfer ownership'; end if;
  if p_new_leader = auth.uid() or not exists (select 1 from workspace_members where workspace_id = ws and user_id = p_new_leader and status = 'active')
    then raise exception 'Target must be another active member'; end if;
  perform set_config('app.transfer', 'on', true);
  update workspace_members set role = 'management' where workspace_id = ws and user_id = auth.uid();
  update workspace_members set role = 'leader' where workspace_id = ws and user_id = p_new_leader;
  perform _log(ws, 'workspace.ownership_transferred', 'workspace', ws, jsonb_build_object('to', p_new_leader)); end $$;

revoke execute on function create_task, transfer_ownership from public, anon;
grant execute on function create_task, transfer_ownership to authenticated;
