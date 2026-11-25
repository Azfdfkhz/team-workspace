import Link from 'next/link';
import { requireMember } from '@/lib/auth/session';
import { PageHeader, Empty, fmt, arr } from '@/components/ui';
const SRC: Record<string, string> = { supabase: 'Supabase', google_drive: 'Google Drive', external_link: 'Link', text: 'Teks' };
export default async function Files({ searchParams }: { searchParams: { q?: string } }) {
  const { sb } = await requireMember();
  const { data } = await sb.from('task_attachments').select('id,source_type,created_at,tasks(id,title),profiles:uploaded_by(display_name),attachment_versions(*)')
    .order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []).flatMap((a: any) => arr<any>(a.attachment_versions).map((v) => ({ a, v })))
    .filter(({ v }) => !searchParams.q || (v.file_name ?? '').toLowerCase().includes(searchParams.q.toLowerCase()));
  const link = async (v: any) => v.storage_path ? (await sb.storage.from('task-files').createSignedUrl(v.storage_path, 300)).data?.signedUrl : v.external_url;
  const urls = await Promise.all(rows.map(({ v }) => link(v)));
  return (
    <>
      <PageHeader title="Files" />
      <form role="search" className="mb-4 flex gap-2"><label className="sr-only" htmlFor="q">Cari nama file</label>
        <input id="q" name="q" defaultValue={searchParams.q} placeholder="Cari nama file" className="input max-w-sm" /><button className="btn">Cari</button></form>
      {!rows.length ? <Empty>Belum ada file.</Empty> : <div className="space-y-2">{rows.map(({ a, v }, i) => (
        <div key={v.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="min-w-0"><p className="truncate font-medium">{v.file_name ?? 'Tanpa nama'}</p>
            <p className="text-xs text-muted">{SRC[a.source_type]} · {a.profiles?.display_name} · {fmt(a.created_at)} · <Link className="underline" href={`/tasks/${a.tasks?.id}`}>{a.tasks?.title}</Link></p></div>
          {urls[i] && <a className="btn" href={urls[i]!} target="_blank" rel="noopener noreferrer">Buka</a>}</div>))}</div>}
    </>
  );
}
