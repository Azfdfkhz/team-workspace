import Link from 'next/link';
import { requireMember, isMgr } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui';
import { signOut } from '../actions';
export default async function More() {
  const { member, user } = await requireMember();
  const links = [['/projects', 'Projects'], ['/calendar', 'Calendar'], ['/activity', 'Activity'],
    ...(isMgr(member.role) ? [['/tasks', 'All Tasks'], ['/team', 'Team']] : []), ...(member.role === 'leader' ? [['/settings', 'Settings']] : [])];
  return (
    <>
      <PageHeader title="Lainnya" sub={user.email ?? ''} />
      <div className="card divide-y divide-line">{links.map(([h, l]) => <Link key={h} href={h} className="block py-3 text-sm">{l}</Link>)}</div>
      <form action={signOut} className="mt-4"><button className="btn w-full">Keluar</button></form>
    </>
  );
}
