# Team Workspace (PRD v1.0)

Next.js 14 (App Router) + Supabase. Login Google / magic link; role Leader · Management · Member ditegakkan oleh RLS + RPC.

## Setup
1. `cp .env.example .env.local` lalu isi URL & anon key Supabase.
2. Jalankan migrasi berurutan: `supabase/migrations/0001_foundation.sql`, `0002_storage_tasks_transfer.sql` (`supabase db push` atau SQL Editor).
3. Supabase Auth → aktifkan provider Google; tambahkan `http://localhost:3000/auth/callback` ke Redirect URLs.
4. `npm install && npm run dev` → login → "Buat workspace" (Anda menjadi Leader) → Team → buat undangan.
5. `npm test` (unit), `npm run typecheck`.

## Tercakup
Login/undangan · dashboard per role (metrik → daftar terfilter) · My Tasks · All Tasks (list/board, filter status/prioritas/project/assignee/overdue, cari) · buat tugas multi-assignee + checklist · detail tugas (status dengan alasan blokir, checklist, komentar) · submit (file/teks/link, versi tersimpan) · review (setujui / revisi + feedback) · riwayat submission · preview gambar & PDF (signed URL 5 menit) · projects · calendar (agenda) · files · notifikasi · activity · team (role, suspend, transfer kepemilikan) · navigasi mobile.

## Belum tercakup (butuh keputusan/kredensial)
Google Drive (Picker + OAuth, PRD §6.10, butuh Google Cloud project) · preview DOCX/XLSX/PPTX/Google Docs · paginasi (daftar dibatasi 100–500 baris) · mention · E2E Playwright & tes RLS terhadap DB nyata · kalender grid bulanan.
