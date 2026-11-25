import Link from 'next/link';
import { requireMember } from '@/lib/auth/session';
import { PageHeader, Empty, fmt } from '@/components/ui';
import { markAllRead } from '../actions';
export default async function Notifications() {
  const { sb, user } = await requireMember();
  const { data } = await sb.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Notifikasi" action={<form action={markAllRead}><button className="btn">Tandai semua dibaca</button></form>} />
      {!data?.length ? <Empty>Tidak ada notifikasi.</Empty> : <div className="space-y-2">{data.map((n: any) => (
        <Link key={n.id} href={n.resource_type === 'task' ? `/tasks/${n.resource_id}` : '/'} className={`card block text-sm hover:border-primary ${n.read_at ? '' : 'border-primary/40 bg-primary-light'}`}>
          <p className="font-medium">{!n.read_at && <span className="mr-1 text-primary">● Baru ·</span>}{n.title}</p><p className="text-xs text-muted">{fmt(n.created_at)}</p></Link>))}</div>}
    </>
  );
}
