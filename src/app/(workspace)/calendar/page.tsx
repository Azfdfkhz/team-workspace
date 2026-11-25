import Link from 'next/link';
import { requireMember } from '@/lib/auth/session';
import { PageHeader, StatusBadge, Empty } from '@/components/ui';
// Agenda view (works on mobile and desktop). A month grid can be layered on later (PRD FR-CAL-05).
export default async function Calendar() {
  const { sb } = await requireMember();
  const { data } = await sb.from('tasks').select('id,title,status,due_at').is('archived_at', null).not('due_at', 'is', null)
    .not('status', 'in', '(completed,cancelled)').order('due_at').limit(300);
  const groups = new Map<string, any[]>();
  (data ?? []).forEach((t: any) => {
    const k = new Date(t.due_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    groups.set(k, [...(groups.get(k) ?? []), t]);
  });
  return (
    <>
      <PageHeader title="Calendar" sub="Deadline tugas (zona waktu Asia/Jakarta)" />
      {!groups.size ? <Empty>Tidak ada deadline mendatang.</Empty> : [...groups].map(([day, ts]) => (
        <section key={day} className="mb-4"><h2 className="mb-1 text-sm font-semibold">{day}</h2>
          <div className="space-y-1">{ts.map((t) => <Link key={t.id} href={`/tasks/${t.id}`} className="card flex items-center justify-between py-2 text-sm hover:border-primary">
            <span>{t.title}</span><StatusBadge s={t.status} /></Link>)}</div></section>))}
    </>
  );
}
