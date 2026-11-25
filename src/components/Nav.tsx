'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; icon?: string };

export default function Nav({
  items,
  mobile,
  name,
}: {
  items: Item[];
  mobile: Item[];
  name: string;
}) {
  const p = usePathname();
  const on = (h: string) => (h === '/' ? p === '/' : p.startsWith(h));

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-white p-3 md:flex">
        {/* Workspace name */}
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-primary-light px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
        </div>

        <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on(i.href) ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                on(i.href)
                  ? 'bg-primary-light font-semibold text-primary'
                  : 'text-ink hover:bg-canvas'
              }`}
            >
              {i.icon && <span aria-hidden className="text-base">{i.icon}</span>}
              {i.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mobile.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on(i.href) ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
              on(i.href) ? 'font-semibold text-primary' : 'text-muted'
            }`}
          >
            {i.icon && <span aria-hidden className="text-xl leading-none">{i.icon}</span>}
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
