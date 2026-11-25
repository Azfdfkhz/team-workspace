-- Collaborative Team Workspace — foundation (PRD §3, §6, §9, §10)
create extension if not exists pgcrypto;

create type member_role as enum ('leader','management','member');
create type member_status as enum ('active','suspended','removed');
create type invitation_status as enum ('pending','accepted','expired','revoked');
create type task_status as enum ('not_started','todo','in_progress','in_review','revision','completed','cancelled');
create type task_priority as enum ('low','medium','high','urgent');
create type review_decision as enum ('approved','revision_requested');
create type attachment_source as enum ('supabase','google_drive','external_link','text');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, email text, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text, logo_url text, timezone text not null default 'Asia/Jakarta',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role member_role not null, status member_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create unique index one_active_leader on workspace_members (workspace_id) where role='leader' and status='active';
create table workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  email text not null, role member_role not null check (role <> 'leader'),
  token_hash text not null unique, status invitation_status not null default 'pending',
  expires_at timestamptz not null, invited_by uuid references profiles,
  accepted_by uuid references profiles, accepted_at timestamptz, created_at timestamptz not null default now()
);
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null, description text, status text not null default 'active',
  created_by uuid references profiles, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid, title text not null check (length(trim(title)) > 0), description text,
  status task_status not null default 'not_started', priority task_priority not null default 'medium',
  start_at timestamptz, due_at timestamptz, created_by uuid references profiles, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references projects (id, workspace_id)
);
create index on tasks (workspace_id, status); create index on tasks (workspace_id, due_at);

create table task_assignees (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
  task_id uuid not null, user_id uuid not null references profiles,
  assigned_by uuid references profiles, assigned_at timestamptz not null default now(),
  unique (task_id, user_id), foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create index on task_assignees (user_id);
create table task_checklist_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, task_id uuid not null,
  title text not null, done boolean not null default false, position int not null default 0,
  foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create table task_comments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, task_id uuid not null,
  author_id uuid not null references profiles, body text not null, created_at timestamptz not null default now(),
  foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create table task_attachments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, task_id uuid not null,
  uploaded_by uuid not null references profiles, source_type attachment_source not null,
  is_reference boolean not null default false, created_at timestamptz not null default now(),
  unique (id, workspace_id), foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
-- immutable snapshots: no UPDATE/DELETE policies exist (PRD FR-SUB-10)
create table attachment_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
  attachment_id uuid not null, version_number int not null,
  storage_path text, provider_file_id text, external_url text, text_content text,
  file_name text, mime_type text, file_size bigint, created_by uuid references profiles,
  created_at timestamptz not null default now(),
  unique (attachment_id, version_number), unique (id, workspace_id),
  foreign key (attachment_id, workspace_id) references task_attachments (id, workspace_id) on delete cascade
);
create table task_submissions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, task_id uuid not null,
  submitted_by uuid not null references profiles, submission_number int not null, message text,
  submitted_at timestamptz not null default now(),
  unique (task_id, submission_number), unique (id, workspace_id),
  foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create table submission_attachments (
  submission_id uuid not null references task_submissions on delete cascade,
  attachment_version_id uuid not null references attachment_versions,
  primary key (submission_id, attachment_version_id)
);
create table task_reviews (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, task_id uuid not null,
  submission_id uuid not null unique references task_submissions, reviewer_id uuid not null references profiles,
  decision review_decision not null, feedback text, reviewed_at timestamptz not null default now(),
  check (decision = 'approved' or length(trim(coalesce(feedback,''))) > 0),
  foreign key (task_id, workspace_id) references tasks (id, workspace_id) on delete cascade
);
create table notifications (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces on delete cascade,
  recipient_id uuid not null references profiles, event_type text not null, title text not null, body text,
  resource_type text, resource_id uuid, read_at timestamptz, created_at timestamptz not null default now()
);
create index on notifications (recipient_id, read_at);
create table activity_logs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces on delete cascade,
  actor_id uuid references profiles, event_type text not null, resource_type text, resource_id uuid,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

-- ---------- helpers (security definer, fixed search_path; avoids RLS recursion) ----------
create function is_active_member(ws uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid() and status = 'active') $$;
create function has_role(ws uuid, roles member_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspace_members where workspace_id = ws and user_id = auth.uid() and status = 'active' and role = any(roles)) $$;
create function is_task_assignee(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from task_assignees a join tasks k on k.id = a.task_id
    where a.task_id = t and a.user_id = auth.uid() and is_active_member(k.workspace_id)) $$;
create function can_view_task(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from tasks k where k.id = t and (has_role(k.workspace_id, array['leader','management']::member_role[]) or is_task_assignee(k.id))) $$;
create function task_transition_allowed(f task_status, t task_status) returns boolean language sql immutable as $$
  select (f, t) in (('not_started','todo'),('not_started','in_progress'),('not_started','cancelled'),
    ('todo','in_progress'),('todo','cancelled'),('in_progress','in_review'),('in_progress','todo'),('in_progress','cancelled'),
    ('in_review','completed'),('in_review','revision'),('revision','in_review'),('revision','in_progress'),('revision','cancelled'),
    ('completed','in_progress')) $$;  -- completed->in_progress = reopen

create function _log(ws uuid, ev text, rtype text, rid uuid, meta jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into activity_logs (workspace_id, actor_id, event_type, resource_type, resource_id, metadata) values (ws, auth.uid(), ev, rtype, rid, meta) $$;
create function _notify(ws uuid, rcpt uuid, ev text, ttl text, rid uuid) returns void
language sql security definer set search_path = public as $$
  insert into notifications (workspace_id, recipient_id, event_type, title, resource_type, resource_id)
  select ws, rcpt, ev, ttl, 'task', rid where rcpt is distinct from auth.uid() $$;

-- ---------- triggers ----------
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function guard_last_leader() returns trigger language plpgsql as $$
begin
  if old.role = 'leader' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'leader' or new.status <> 'active') then
    raise exception 'Cannot remove or demote the last active Leader'; end if;
  return coalesce(new, old); end $$;
create trigger last_leader_guard before update or delete on workspace_members for each row execute function guard_last_leader();

create function assignee_must_be_active() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from workspace_members where workspace_id = new.workspace_id and user_id = new.user_id and status = 'active') then
    raise exception 'Assignee must be an active workspace member'; end if;
  return new; end $$;
create trigger assignee_check before insert on task_assignees for each row execute function assignee_must_be_active();

-- ---------- RPCs ----------
create function create_workspace(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from workspaces) then raise exception 'Workspace already exists (single-workspace MVP)'; end if;
  insert into workspaces (name, created_by) values (p_name, auth.uid()) returning id into ws;
  insert into workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'leader');
  perform _log(ws, 'workspace.created', 'workspace', ws); return ws; end $$;

create function accept_invitation(p_token text) returns uuid language plpgsql security definer set search_path = public as $$
declare inv workspace_invitations;
begin
  select * into inv from workspace_invitations where token_hash = encode(digest(p_token,'sha256'),'hex') for update;
  if not found or inv.status <> 'pending' or inv.expires_at < now() then raise exception 'Invalid or expired invitation'; end if;
  if lower(inv.email) <> lower(auth.jwt()->>'email') then raise exception 'Invitation was issued to a different email'; end if;
  insert into workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do update set role = excluded.role, status = 'active';
  update workspace_invitations set status='accepted', accepted_by=auth.uid(), accepted_at=now() where id = inv.id;
  perform _log(inv.workspace_id, 'invitation.accepted', 'invitation', inv.id); return inv.workspace_id; end $$;

-- Member: only -> in_progress on assigned tasks. Leader/Management: any valid transition except review-driven ones.
create function change_task_status(p_task uuid, p_to task_status) returns void language plpgsql security definer set search_path = public as $$
declare k tasks; mgr boolean;
begin
  select * into k from tasks where id = p_task for update;
  if not found or not can_view_task(p_task) then raise exception 'Task not found'; end if;
  mgr := has_role(k.workspace_id, array['leader','management']::member_role[]);
  if p_to in ('in_review','revision','completed') then raise exception 'Use submit_for_review / review_submission'; end if;
  if not mgr and p_to <> 'in_progress' then raise exception 'Members may only start work on assigned tasks'; end if;
  if not task_transition_allowed(k.status, p_to) then raise exception 'Transition % -> % is not allowed', k.status, p_to; end if;
  update tasks set status = p_to, updated_at = now() where id = p_task;
  perform _log(k.workspace_id, 'task.status_changed', 'task', p_task, jsonb_build_object('from', k.status, 'to', p_to)); end $$;

create function submit_for_review(p_task uuid, p_message text, p_versions uuid[]) returns uuid language plpgsql security definer set search_path = public as $$
declare k tasks; sid uuid; n int; m record;
begin
  select * into k from tasks where id = p_task for update;   -- row lock = no double submit
  if not found or not (is_task_assignee(p_task) or has_role(k.workspace_id, array['leader','management']::member_role[]))
    then raise exception 'Not allowed'; end if;
  if k.status not in ('in_progress','revision') then raise exception 'Task is % and cannot be submitted', k.status; end if;
  if coalesce(array_length(p_versions,1),0) = 0 and coalesce(trim(p_message),'') = '' then raise exception 'Submission is empty'; end if;
  if (select count(*) from attachment_versions v join task_attachments a on a.id = v.attachment_id
      where v.id = any(p_versions) and a.task_id = p_task) <> coalesce(array_length(p_versions,1),0)
    then raise exception 'Attachment versions must belong to this task'; end if;
  select coalesce(max(submission_number),0)+1 into n from task_submissions where task_id = p_task;
  insert into task_submissions (workspace_id, task_id, submitted_by, submission_number, message)
    values (k.workspace_id, p_task, auth.uid(), n, p_message) returning id into sid;
  insert into submission_attachments select sid, unnest(p_versions);
  update tasks set status = 'in_review', updated_at = now() where id = p_task;
  for m in select user_id from workspace_members where workspace_id = k.workspace_id and status='active' and role in ('leader','management') loop
    perform _notify(k.workspace_id, m.user_id, 'submission.awaiting_review', 'Submission awaiting review: ' || k.title, p_task); end loop;
  perform _log(k.workspace_id, 'submission.created', 'task', p_task, jsonb_build_object('submission_number', n)); return sid; end $$;

create function review_submission(p_submission uuid, p_decision review_decision, p_feedback text) returns void language plpgsql security definer set search_path = public as $$
declare s task_submissions; k tasks; a record;
begin
  select * into s from task_submissions where id = p_submission;
  if not found then raise exception 'Submission not found'; end if;
  select * into k from tasks where id = s.task_id for update;
  if not has_role(k.workspace_id, array['leader','management']::member_role[]) then raise exception 'Not allowed'; end if;
  if s.submitted_by = auth.uid() then raise exception 'You cannot review your own submission'; end if;
  if k.status <> 'in_review' then raise exception 'Task is not awaiting review'; end if;
  if p_decision = 'revision_requested' and coalesce(trim(p_feedback),'') = '' then raise exception 'Feedback is required for a revision request'; end if;
  insert into task_reviews (workspace_id, task_id, submission_id, reviewer_id, decision, feedback)
    values (k.workspace_id, k.id, s.id, auth.uid(), p_decision, p_feedback);   -- unique(submission_id) blocks double review
  update tasks set status = case p_decision when 'approved' then 'completed'::task_status else 'revision'::task_status end, updated_at = now() where id = k.id;
  for a in select user_id from task_assignees where task_id = k.id loop
    perform _notify(k.workspace_id, a.user_id, case p_decision when 'approved' then 'submission.approved' else 'submission.revision_requested' end, k.title, k.id); end loop;
  perform _log(k.workspace_id, 'review.' || p_decision, 'task', k.id, jsonb_build_object('submission_id', s.id)); end $$;

-- ---------- RLS ----------
do $$ declare t text; begin
  foreach t in array array['profiles','workspaces','workspace_members','workspace_invitations','projects','tasks','task_assignees',
    'task_checklist_items','task_comments','task_attachments','attachment_versions','task_submissions','submission_attachments',
    'task_reviews','notifications','activity_logs'] loop
    execute format('alter table %I enable row level security', t); end loop; end $$;

create policy profiles_read on profiles for select using (id = auth.uid() or exists (
  select 1 from workspace_members a join workspace_members b on a.workspace_id = b.workspace_id
  where a.user_id = auth.uid() and a.status='active' and b.user_id = profiles.id));
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy ws_read on workspaces for select using (is_active_member(id));
create policy ws_update on workspaces for update using (has_role(id, array['leader']::member_role[]));

create policy wm_read on workspace_members for select using (user_id = auth.uid() or is_active_member(workspace_id));
create policy wm_update on workspace_members for update using (has_role(workspace_id, array['leader']::member_role[]));

create policy inv_read on workspace_invitations for select using (has_role(workspace_id, array['leader']::member_role[]));
create policy inv_write on workspace_invitations for all using (has_role(workspace_id, array['leader']::member_role[]))
  with check (has_role(workspace_id, array['leader']::member_role[]));

create policy proj_read on projects for select using (is_active_member(workspace_id));
create policy proj_write on projects for all using (has_role(workspace_id, array['leader','management']::member_role[]))
  with check (has_role(workspace_id, array['leader','management']::member_role[]));

create policy task_read on tasks for select using (can_view_task(id));
create policy task_insert on tasks for insert with check (has_role(workspace_id, array['leader','management']::member_role[]) and created_by = auth.uid());
create policy task_update on tasks for update using (has_role(workspace_id, array['leader','management']::member_role[]))
  with check (has_role(workspace_id, array['leader','management']::member_role[]));
revoke update (status) on tasks from authenticated;   -- status changes only through RPCs

create policy ta_read on task_assignees for select using (can_view_task(task_id));
create policy ta_write on task_assignees for all using (has_role(workspace_id, array['leader','management']::member_role[]))
  with check (has_role(workspace_id, array['leader','management']::member_role[]));

create policy cl_read on task_checklist_items for select using (can_view_task(task_id));
create policy cl_insert on task_checklist_items for insert with check (has_role(workspace_id, array['leader','management']::member_role[]));
create policy cl_update on task_checklist_items for update using (is_task_assignee(task_id) or has_role(workspace_id, array['leader','management']::member_role[]));
revoke update on task_checklist_items from authenticated; grant update (done) on task_checklist_items to authenticated;

create policy cm_read on task_comments for select using (can_view_task(task_id));
create policy cm_insert on task_comments for insert with check (author_id = auth.uid() and can_view_task(task_id));

create policy att_read on task_attachments for select using (can_view_task(task_id));
create policy att_insert on task_attachments for insert with check (uploaded_by = auth.uid() and can_view_task(task_id));
create policy av_read on attachment_versions for select using (can_view_task((select task_id from task_attachments where id = attachment_id)));
create policy av_insert on attachment_versions for insert with check (created_by = auth.uid()
  and can_view_task((select task_id from task_attachments where id = attachment_id)));

create policy sub_read on task_submissions for select using (can_view_task(task_id));
create policy sa_read on submission_attachments for select using (can_view_task((select task_id from task_submissions where id = submission_id)));
create policy rev_read on task_reviews for select using (can_view_task(task_id));   -- writes only via review_submission()

create policy notif_read on notifications for select using (recipient_id = auth.uid());
create policy notif_update on notifications for update using (recipient_id = auth.uid());
revoke update on notifications from authenticated; grant update (read_at) on notifications to authenticated;

create policy log_read on activity_logs for select using (
  has_role(workspace_id, array['leader','management']::member_role[])
  or (resource_type = 'task' and can_view_task(resource_id)));

revoke execute on all functions in schema public from public, anon;
grant execute on function create_workspace, accept_invitation, change_task_status, submit_for_review, review_submission to authenticated;

-- helpers are called from RLS policies as the invoking user
grant execute on function is_active_member(uuid), has_role(uuid, member_role[]), is_task_assignee(uuid),
  can_view_task(uuid), task_transition_allowed(task_status, task_status) to authenticated;
