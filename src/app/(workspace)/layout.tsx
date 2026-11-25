import { getCtx, isMgr } from '@/lib/auth/session';
import Nav from '@/components/Nav';
import SetupForm from '@/components/SetupForm';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { member } = await getCtx();

  if (!member) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
        <div>
          <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">T</span>
          <h1 className="text-2xl font-semibold tracking-tight">Buat workspace</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Anda belum bergabung dengan workspace. Buat ruang kerja baru atau buka tautan undangan.</p>
        </div>
        <SetupForm />
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
    { href: '/', label: 'Home', icon: '🏠' }, { href: '/my-tasks', label: 'Tasks', icon: '✅' },
    { href: '/files', label: 'Files', icon: '📎' }, { href: '/notifications', label: 'Notif', icon: '🔔' },
    { href: '/more', label: 'More', icon: '⋯' },
  ];

  return (
    <div className="min-h-screen">
      <Nav items={items} mobile={mobile} name={member.workspaces?.name ?? 'Workspace'} />
      <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-28 pt-7 sm:px-6 md:ml-60 md:px-10 md:pb-12 md:pt-10">
        <div className="mb-7 flex items-center justify-between border-b border-line pb-4 md:hidden">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.workspaces?.name ?? 'Workspace'}</p><p className="text-xs text-muted">Teamspace</p></div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">{(member.workspaces?.name ?? 'W').charAt(0).toUpperCase()}</span>
        </div>
        {children}
      </main>
    </div>
  );
}
