import { requireMember } from '@/lib/auth/session';
import { PageHeader, Empty, fmt } from '@/components/ui';
export default async function Activity() {
  const { sb } = await requireMember();
  const { data } = await sb.from('activity_logs').select('id,event_type,resource_type,resource_id,metadata,created_at,profiles:actor_id(display_name)')
    .order('created_at', { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Activity" />
      {!data?.length ? <Empty>Belum ada aktivitas.</Empty> : <div className="card divide-y divide-line">{data.map((l: any) => (
        <div key={l.id} className="flex justify-between gap-3 py-2 text-sm"><span><b>{l.profiles?.display_name ?? 'Sistem'}</b> · {l.event_type}</span>
          <span className="shrink-0 text-xs text-muted">{fmt(l.created_at)}</span></div>))}</div>}
    </>
  );
}
