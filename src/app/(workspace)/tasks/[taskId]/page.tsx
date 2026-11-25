import { notFound } from 'next/navigation';
import { requireMember, isMgr } from '@/lib/auth/session';
import { PageHeader, StatusBadge, ErrorBanner, Preview, PRIORITY, fmt, arr, isOverdue } from '@/components/ui';
import { whyTransitionBlocked, type TaskStatus, type Role } from '@/lib/permissions/task-status';
import { setStatus, toggleItem, addComment, submit, review } from './actions';

export default async function TaskDetail({ params, searchParams }: { params: { taskId: string }; searchParams: { error?: string } }) {
  const { sb, user, member } = await requireMember();
  const id = params.taskId; const role = member.role as Role; const mgr = isMgr(role);
  const { data: t } = await sb.from('tasks').select('*, projects(name), task_assignees(user_id,profiles(display_name))').eq('id', id).maybeSingle();
  if (!t) notFound();   // RLS hides tasks the user may not see (AC-05)
  const [{ data: items }, { data: comments }, { data: subs }] = await Promise.all([
    sb.from('task_checklist_items').select('*').eq('task_id', id).order('position'),
    sb.from('task_comments').select('*, profiles:author_id(display_name)').eq('task_id', id).order('created_at'),
    sb.from('task_submissions').select('*, profiles:submitted_by(display_name), task_reviews(*, profiles:reviewer_id(display_name)), submission_attachments(attachment_versions(*))')
      .eq('task_id', id).order('submission_number', { ascending: false }),
  ]);
  const signed = async (v: any) => v.storage_path ? (await sb.storage.from('task-files').createSignedUrl(v.storage_path, 300)).data?.signedUrl : v.external_url;
  const isAssignee = arr<any>(t.task_assignees).some((a) => a.user_id === user.id);
  const canSubmit = (isAssignee || mgr) && ['in_progress', 'revision'].includes(t.status);
  const doneCount = (items ?? []).filter((i: any) => i.done).length;
  const pending = (subs ?? []).find((s: any) => !arr(s.task_reviews).length);
  const cards = await Promise.all((subs ?? []).map(async (s: any) => {
    const vs = arr<any>(s.submission_attachments).map((x: any) => x.attachment_versions).filter(Boolean);
    return { s, vs, urls: await Promise.all(vs.map(signed)), rv: arr<any>(s.task_reviews)[0] };
  }));
  const reasons: string[] = [];
  const moves = (['todo', 'in_progress', 'cancelled'] as TaskStatus[]).map((to) => {
    const why = whyTransitionBlocked(t.status, to, role, isAssignee); if (why) reasons.push(`${to}: ${why}`);
    return { to, why };
  });
  return (
    <>
      <PageHeader title={t.title} sub={`${t.projects?.name ?? 'Tanpa project'} · ${PRIORITY[t.priority]}`} action={<StatusBadge s={t.status} />} />
      <ErrorBanner msg={searchParams.error} />
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {t.description && <section className="card whitespace-pre-wrap text-sm">{t.description}</section>}
          <section className="card"><h2 className="mb-2 text-sm font-semibold">Checklist ({doneCount}/{items?.length ?? 0})</h2>
            {(items ?? []).map((i: any) => (
              <form key={i.id} action={toggleItem.bind(null, id, i.id, !i.done)}>
                <button disabled={!isAssignee && !mgr} aria-pressed={i.done} className="flex min-h-[36px] w-full items-center gap-2 text-left text-sm disabled:opacity-60">
                  <span aria-hidden>{i.done ? '☑' : '☐'}</span><span className={i.done ? 'text-muted line-through' : ''}>{i.title}</span></button></form>))}
            {!items?.length && <p className="text-sm text-muted">Tidak ada checklist.</p>}</section>

          {canSubmit && (
            <form action={submit.bind(null, id)} className="card space-y-3">
              <h2 className="text-sm font-semibold">Submit untuk review</h2>
              <div><label className="label" htmlFor="message">Catatan</label><textarea id="message" name="message" rows={2} className="input py-2" /></div>
              <div><label className="label" htmlFor="files">File (PDF, gambar, txt/md, docx, xlsx, pptx · maks 10 MB)</label><input id="files" name="files" type="file" multiple className="input py-2" /></div>
              <div><label className="label" htmlFor="text">Teks</label><textarea id="text" name="text" rows={2} className="input py-2" /></div>
              <div><label className="label" htmlFor="link">Link (desain / eksternal)</label><input id="link" name="link" type="url" placeholder="https://" className="input" /></div>
              <button className="btn btn-primary">Submit for review</button>
            </form>)}

          <section><h2 className="mb-2 text-sm font-semibold">Submission & review</h2>
            {!subs?.length && <p className="text-sm text-muted">Belum ada submission.</p>}
            {cards.map(({ s, vs, urls, rv }: any) => (
                <article key={s.id} className="card mb-3 space-y-2">
                  <p className="text-sm font-medium">Submission #{s.submission_number} <span className="font-normal text-muted">· {s.profiles?.display_name} · {fmt(s.submitted_at)}</span></p>
                  {s.message && <p className="whitespace-pre-wrap text-sm">{s.message}</p>}
                  {vs.map((v: any, i: number) => <div key={v.id} className="space-y-1">
                    <p className="text-xs text-muted">{v.file_name} · versi {v.version_number}</p>
                    {v.text_content ? <p className="whitespace-pre-wrap rounded bg-canvas p-2 text-sm">{v.text_content}</p> : <Preview url={urls[i]} mime={v.mime_type} name={v.file_name} />}</div>)}
                  {rv && <p className={`rounded p-2 text-sm ${rv.decision === 'approved' ? 'bg-emerald-50 text-ok' : 'bg-red-50 text-bad'}`}>
                    {rv.decision === 'approved' ? 'Disetujui' : 'Revisi diminta'} oleh {rv.profiles?.display_name} · {fmt(rv.reviewed_at)}{rv.feedback && <><br />{rv.feedback}</>}</p>}
                  {mgr && pending?.id === s.id && t.status === 'in_review' && s.submitted_by !== user.id && (
                    <form action={review.bind(null, id, s.id)} className="space-y-2 border-t border-line pt-2">
                      <label className="label" htmlFor="feedback">Feedback (wajib untuk revisi)</label><textarea id="feedback" name="feedback" rows={2} className="input py-2" />
                      <div className="flex gap-2"><button name="decision" value="approved" className="btn btn-primary">Setujui</button>
                        <button name="decision" value="revision_requested" className="btn">Minta revisi</button></div></form>)}
                </article>))}</section>

          <section className="card"><h2 className="mb-2 text-sm font-semibold">Komentar</h2>
            <div className="mb-3 space-y-2">{(comments ?? []).map((c: any) => <div key={c.id} className="text-sm"><span className="font-medium">{c.profiles?.display_name}</span>
              <span className="text-xs text-muted"> · {fmt(c.created_at)}</span><p className="whitespace-pre-wrap">{c.body}</p></div>)}</div>
            <form action={addComment.bind(null, id)} className="flex gap-2"><label className="sr-only" htmlFor="body">Komentar</label>
              <input id="body" name="body" required className="input" placeholder="Tulis komentar" /><button className="btn">Kirim</button></form></section>
        </div>

        <aside className="space-y-4">
          <section className="card space-y-2 text-sm">
            <p><span className="text-muted">Deadline</span><br /><span className={isOverdue(t) ? 'font-medium text-bad' : ''}>{isOverdue(t) && 'Terlambat · '}{fmt(t.due_at)}</span></p>
            <p><span className="text-muted">Assignee</span><br />{arr<any>(t.task_assignees).map((a) => a.profiles?.display_name).join(', ') || '—'}</p>
          </section>
          {!['in_review', 'completed'].includes(t.status) && (isAssignee || mgr) && (
            <section className="card"><h2 className="mb-2 text-sm font-semibold">Ubah status</h2>
              <div className="flex flex-wrap gap-2">{moves.map(({ to, why }) => (
                <form key={to} action={setStatus.bind(null, id, to)}><button className="btn" disabled={!!why} title={why ?? ''}>{to === 'cancelled' ? 'Batalkan' : to === 'todo' ? 'To do' : 'Mulai kerjakan'}</button></form>))}</div>
              {reasons.length > 0 && <p className="mt-2 text-xs text-muted">Beberapa aksi tidak tersedia: arahkan kursor / fokus pada tombol untuk alasannya.</p>}</section>)}
          {mgr && t.status === 'completed' && <form action={setStatus.bind(null, id, 'in_progress')}><button className="btn w-full">Buka kembali tugas</button></form>}
        </aside>
      </div>
    </>
  );
}
