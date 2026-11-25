'use server';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireMember } from '@/lib/auth/session';

const MAX = 10 * 1024 * 1024;
const TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'], gif: ['image/gif'],
  txt: ['text/plain'], md: ['text/markdown', 'text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};
const back = (id: string, error?: string): never => redirect(`/tasks/${id}${error ? `?error=${encodeURIComponent(error)}` : ''}`);
const done = (id: string, error?: { message: string } | null) => { if (error) back(id, error.message); revalidatePath(`/tasks/${id}`); };

export async function setStatus(id: string, to: string) {
  const { sb } = await requireMember(); done(id, (await sb.rpc('change_task_status', { p_task: id, p_to: to })).error);
}
export async function toggleItem(id: string, itemId: string, value: boolean) {
  const { sb } = await requireMember(); done(id, (await sb.from('task_checklist_items').update({ done: value }).eq('id', itemId)).error);
}
export async function addComment(id: string, fd: FormData) {
  const { sb, user, member } = await requireMember();
  const body = String(fd.get('body') ?? '').trim(); if (!body) return back(id, 'Komentar kosong');
  done(id, (await sb.from('task_comments').insert({ workspace_id: member.workspace_id, task_id: id, author_id: user.id, body })).error);
}
export async function review(id: string, submissionId: string, fd: FormData) {
  const { sb } = await requireMember();
  done(id, (await sb.rpc('review_submission', { p_submission: submissionId, p_decision: fd.get('decision'), p_feedback: String(fd.get('feedback') ?? '') })).error);
}
export async function submit(id: string, fd: FormData) {
  const { sb, user, member } = await requireMember();
  const ws = member.workspace_id as string; const versions: string[] = [];
  const addVersion = async (source: string, v: Record<string, unknown>) => {
    const a = await sb.from('task_attachments').insert({ workspace_id: ws, task_id: id, uploaded_by: user.id, source_type: source }).select('id').single();
    if (a.error) return back(id, a.error.message);
    const r = await sb.from('attachment_versions').insert({ workspace_id: ws, attachment_id: a.data.id, version_number: 1, created_by: user.id, ...v }).select('id').single();
    if (r.error) return back(id, r.error.message);
    versions.push(r.data.id);
  };
  for (const f of fd.getAll('files') as File[]) {
    if (!f.size) continue;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (f.size > MAX) return back(id, `${f.name}: melebihi 10 MB`);
    if (!TYPES[ext]?.includes(f.type)) return back(id, `${f.name}: tipe file tidak diizinkan`);
    const path = `${ws}/${id}/${randomUUID()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
    const up = await sb.storage.from('task-files').upload(path, f, { contentType: f.type });
    if (up.error) return back(id, `Upload gagal: ${up.error.message}`);
    await addVersion('supabase', { storage_path: path, file_name: f.name, mime_type: f.type, file_size: f.size });
  }
  const text = String(fd.get('text') ?? '').trim();
  if (text) await addVersion('text', { text_content: text, file_name: 'Teks' });
  const link = String(fd.get('link') ?? '').trim();
  if (link) {
    if (!z.string().url().regex(/^https?:\/\//).safeParse(link).success) return back(id, 'URL tidak valid');
    await addVersion('external_link', { external_url: link, file_name: link });
  }
  done(id, (await sb.rpc('submit_for_review', { p_task: id, p_message: String(fd.get('message') ?? ''), p_versions: versions })).error);
}
