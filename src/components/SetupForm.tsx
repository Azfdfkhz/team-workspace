'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { createWorkspace } from '@/app/(workspace)/actions';
function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Membuat…' : 'Buat workspace'}</button>;
}
export default function SetupForm() {
  const [state, action] = useFormState(createWorkspace, { error: '' });
  return (
    <form action={action} className="card space-y-4">
      <div><label className="label" htmlFor="name">Nama workspace</label><input id="name" name="name" required className="input" placeholder="Nama workspace Anda" /></div>
      {state.error && <p role="alert" className="rounded-md border border-bad/30 bg-red-50 p-3 text-sm text-bad">{state.error}</p>}
      <Submit />
    </form>
  );
}
