'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; icon?: string };

const glyph: Record<string, string> = {
  '🏠': '⌂', '✅': '✓', '📋': '≡', '📁': '▱', '📅': '▦',
  '📎': '↗', '👥': '◉', '📊': '⌁', '🔔': '◌', '⚙️': '⚙',
  '⋯': '···',
};

export default function Nav({ items, mobile, name }: { items: Item[]; mobile: Item[]; name: string }) {
  const p = usePathname();
  const on = (h: string) => h === '/' ? p === '/' : p.startsWith(h);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-white px-4 py-5 md:flex">
        <div className="mb-9 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">T</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-ink">Teamspace</p>
            <p className="truncate text-xs text-muted">Workspace manager</p>
          </div>
        </div>
        <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#9aa49d]">Workspace</div>
        <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-[#f7f9f7] px-3 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-xs font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>
          <span className="truncate text-sm font-medium text-ink">{name}</span>
          <span className="ml-auto text-xs text-muted">⌄</span>
        </div>
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#9aa49d]">Menu utama</div>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={on(i.href) ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors ${
                on(i.href) ? 'bg-primary-light font-semibold text-primary' : 'text-[#68756d] hover:bg-[#f7f9f7] hover:text-ink'
              }`}>
              <span aria-hidden className={`flex h-5 w-5 items-center justify-center text-base ${on(i.href) ? 'text-primary' : 'text-[#8b9890]'}`}>{glyph[i.icon ?? ''] ?? '·'}</span>
              {i.label}
              {on(i.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-2 pt-4 text-[11px] text-muted">Teamspace · ruang kerja bersama</div>
      </aside>

      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {mobile.map((i) => (
          <Link key={i.href} href={i.href} aria-current={on(i.href) ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${on(i.href) ? 'font-semibold text-primary' : 'text-muted'}`}>
            <span aria-hidden className="text-lg leading-none">{glyph[i.icon ?? ''] ?? '·'}</span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
