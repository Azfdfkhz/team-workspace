import Link from 'next/link';
import type { ReactNode } from 'react';

export const arr = <T,>(x: T | T[] | null | undefined): T[] =>
  x == null ? [] : Array.isArray(x) ? x : [x];

export const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  not_started: { label: 'Belum mulai',  cls: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  todo:        { label: 'To do',         cls: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-500' },
  in_progress: { label: 'Dikerjakan',    cls: 'bg-primary-light text-primary', dot: 'bg-primary' },
  in_review:   { label: 'Direview',      cls: 'bg-amber-50 text-warn',         dot: 'bg-warn' },
  revision:    { label: 'Revisi',        cls: 'bg-red-50 text-bad',            dot: 'bg-bad' },
  completed:   { label: 'Selesai',       cls: 'bg-emerald-50 text-ok',         dot: 'bg-ok' },
  cancelled:   { label: 'Dibatalkan',    cls: 'bg-slate-100 text-muted',       dot: 'bg-slate-300' },
};

export const PRIORITY: Record<string, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak',
};

export const PRIORITY_CLS: Record<string, string> = {
  low:    'text-slate-500',
  medium: 'text-primary',
  high:   'text-warn',
  urgent: 'text-bad font-semibold',
};

export const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

export const isOverdue = (t: any) =>
  !!t.due_at &&
  new Date(t.due_at) < new Date() &&
  !['completed', 'cancelled'].includes(t.status);

/* ── Status badge ──────────────────────────────────────── */
export const StatusBadge = ({ s }: { s: string }) => {
  const st = STATUS[s];
  return (
    <span className={`badge ${st?.cls ?? 'bg-slate-100 text-slate-600'}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${st?.dot ?? 'bg-slate-400'}`} />
      {st?.label ?? s}
    </span>
  );
};

/* ── Page header ───────────────────────────────────────── */
export const PageHeader = ({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) => (
  <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-1 text-sm leading-6 text-muted">{sub}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ── Empty state ───────────────────────────────────────── */
export const Empty = ({ children, icon }: { children: ReactNode; icon?: string }) => (
  <div className="card flex flex-col items-center gap-2 border-dashed bg-[#fbfcfa] py-14 text-center">
    {icon && <span className="text-3xl" aria-hidden>{icon}</span>}
    <p className="text-sm text-muted">{children}</p>
  </div>
);

/* ── Error / success banner ────────────────────────────── */
export const ErrorBanner = ({ msg }: { msg?: string }) =>
  msg ? (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-xl border border-[#f0d8d4] bg-[#fff8f6] p-3 text-sm text-bad"
    >
      <span aria-hidden className="mt-0.5 shrink-0">⚠</span>
      <span>{msg}</span>
    </div>
  ) : null;

/* ── Task row (list view) ──────────────────────────────── */
export function TaskRow({ t }: { t: any }) {
  const names = arr<any>(t.task_assignees)
    .map((a) => a.profiles?.display_name)
    .filter(Boolean)
    .join(', ');
  const overdue = isOverdue(t);
  return (
    <Link
      href={`/tasks/${t.id}`}
      className="card flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-[#cbd9d0] hover:bg-[#fcfdfb]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{t.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`text-xs ${PRIORITY_CLS[t.priority]}`}>{PRIORITY[t.priority]}</span>
          {names && <span className="text-xs text-muted">· {names}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        {t.due_at && (
          <span
            className={`rounded-md px-2 py-0.5 ${
              overdue ? 'bg-red-50 font-medium text-bad' : 'bg-canvas text-muted'
            }`}
          >
            {overdue ? '⏰ Terlambat · ' : ''}{fmt(t.due_at)}
          </span>
        )}
        <StatusBadge s={t.status} />
      </div>
    </Link>
  );
}

/* ── File/media preview ────────────────────────────────── */
export function Preview({
  url,
  mime,
  name,
}: {
  url?: string | null;
  mime?: string | null;
  name?: string | null;
}) {
  if (!url) return <span className="text-xs text-muted">Tidak tersedia</span>;
  if (mime?.startsWith('image/'))
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="max-h-72 rounded-lg border border-line object-contain"
      />
    );
  if (mime === 'application/pdf')
    return (
      <iframe
        src={url}
        title={name ?? 'PDF'}
        className="h-96 w-full rounded-lg border border-line"
      />
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
    >
      📎 Buka / unduh {name}
    </a>
  );
}
