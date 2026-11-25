import { getCtx, isMgr } from '@/lib/auth/session';
import Nav from '@/components/Nav';
import { ErrorBanner } from '@/components/ui';
import { createWorkspace } from './actions';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { member } = await getCtx();

  if (!member) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Buat workspace</h1>
          <p className="mt-1 text-sm text-muted">
            Anda belum bergabung dengan workspace. Buat workspace baru (Anda menjadi Leader) atau
            buka tautan undangan.
          </p>
        </div>
        <form action={createWorkspace} className="card space-y-4">
          <div>
            <label className="label" htmlFor="name">Nama workspace</label>
            <input id="name" name="name" required className="input" placeholder="Nama workspace Anda" />
          </div>
          <button className="btn btn-primary w-full">Buat workspace</button>
        </form>
      </main>
    );
  }

  const r = member.role as string;
  const items = [
    { href: '/', label: 'Overview', icon: '🏠' },
    { href: '/my-tasks', label: 'My Tasks', icon: '✅' },
    ...(isMgr(r) ? [{ href: '/tasks', label: 'All Tasks', icon: '📋' }] : []),
    { href: '/projects', label: 'Projects', icon: '📁' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/files', label: 'Files', icon: '📎' },
    ...(isMgr(r) ? [{ href: '/team', label: 'Team', icon: '👥' }] : []),
    { href: '/activity', label: 'Activity', icon: '📊' },
    { href: '/notifications', label: 'Notifikasi', icon: '🔔' },
    ...(r === 'leader' ? [{ href: '/settings', label: 'Settings', icon: '⚙️' }] : []),
  ];

  const mobile = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/my-tasks', label: 'Tasks', icon: '✅' },
    { href: '/files', label: 'Files', icon: '📎' },
    { href: '/notifications', label: 'Notif', icon: '🔔' },
    { href: '/more', label: 'More', icon: '⋯' },
  ];

  return (
    <div className="min-h-screen">
      <Nav items={items} mobile={mobile} name={member.workspaces?.name ?? 'Workspace'} />
      <main className="mx-auto max-w-5xl p-4 pb-28 md:ml-56 md:p-8">{children}</main>
    </div>
  );
}
