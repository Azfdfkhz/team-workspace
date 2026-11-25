import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ErrorBanner } from '@/components/ui';
export default async function Invite({ params, searchParams }: { params: { token: string }; searchParams: { error?: string } }) {
  const { data: { user } } = await createClient().auth.getUser();
  async function accept() {
    'use server';
    const { error } = await createClient().rpc('accept_invitation', { p_token: params.token });
    if (error) redirect(`/invite/${params.token}?error=${encodeURIComponent(error.message)}`);
    redirect('/');
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Undangan Workspace</h1>
      <ErrorBanner msg={searchParams.error} />
      {user ? <form action={accept}><button className="btn btn-primary w-full">Terima undangan</button></form>
        : <Link className="btn btn-primary" href={`/login?next=/invite/${params.token}`}>Masuk untuk menerima</Link>}
    </main>
  );
}
