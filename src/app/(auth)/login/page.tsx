'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'otp' | 'password';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('otp');
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError) setErr(urlError);
  }, []);

  const getNext = () =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('next') ?? '/'
      : '/';

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNext())}`;

  const google = async () => {
    setErr('');
    setLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOtpSent(true);
    setInfo(`Tautan & kode masuk telah dikirim ke ${email.trim()}.`);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push(getNext());
    router.refresh();
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    setLoading(true);
    const sb = createClient();

    if (isRegister) {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      setLoading(false);
      if (error) {
        setErr(error.message);
        return;
      }
      if (data.session) {
        router.push(getNext());
        router.refresh();
        return;
      }
      setInfo('Akun dibuat! Cek email Anda untuk konfirmasi sebelum masuk.');
      return;
    }

    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push(getNext());
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow">
            T
          </div>
          <h1 className="text-2xl font-bold text-ink">Team Workspace</h1>
          <p className="mt-1 text-sm text-muted">Masuk untuk melanjutkan</p>
        </div>

        {err && (
          <div role="alert" className="rounded-xl border border-bad/30 bg-red-50 p-3 text-sm text-bad">
            {err}
          </div>
        )}
        {info && (
          <div role="status" className="rounded-xl border border-ok/30 bg-emerald-50 p-3 text-sm text-ok">
            {info}
          </div>
        )}

        <button
          className="btn btn-primary w-full gap-2 py-2.5"
          onClick={google}
          disabled={loading}
          type="button"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Lanjutkan dengan Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-canvas px-2 text-muted">atau masuk dengan email</span>
          </div>
        </div>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1">
          <button
            type="button"
            onClick={() => { setMode('otp'); setErr(''); setInfo(''); }}
            className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
              mode === 'otp' ? 'bg-primary text-white' : 'text-muted hover:text-ink'
            }`}
          >
            Tautan / Kode OTP
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setErr(''); setInfo(''); }}
            className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
              mode === 'password' ? 'bg-primary text-white' : 'text-muted hover:text-ink'
            }`}
          >
            Password
          </button>
        </div>

        {mode === 'otp' ? (
          !otpSent ? (
            <form onSubmit={sendOtp} className="card space-y-4">
              <div>
                <label className="label" htmlFor="email-otp">Email</label>
                <input
                  id="email-otp"
                  type="email"
                  required
                  className="input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Mengirim…' : 'Kirim tautan / kode masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="card space-y-4">
              <div className="space-y-1 text-xs text-muted">
                <p className="font-semibold text-ink">Langkah selanjutnya:</p>
                <p>1. Buka inbox (atau folder Spam) di <b>{email}</b> dan klik tautan masuk, <b>atau</b></p>
                <p>2. Masukkan kode 6 digit dari email di bawah ini:</p>
              </div>
              <div>
                <label className="label" htmlFor="otp">Kode OTP 6 digit</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="input text-center font-mono text-base tracking-widest"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
              <button className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Memverifikasi…' : 'Verifikasi & Masuk'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  disabled={loading}
                  onClick={sendOtp}
                >
                  Kirim ulang email
                </button>
                <button
                  type="button"
                  className="text-muted hover:text-ink"
                  onClick={() => { setOtpSent(false); setOtpCode(''); setInfo(''); setErr(''); }}
                >
                  Ganti email
                </button>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={submitPassword} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email-pw">Email</label>
              <input
                id="email-pw"
                type="email"
                required
                className="input"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="pw">Password</label>
              <input
                id="pw"
                type="password"
                required
                minLength={6}
                className="input"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Memproses…' : isRegister ? 'Daftar & Masuk' : 'Masuk'}
            </button>
            <p className="text-center text-xs text-muted">
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => { setIsRegister(!isRegister); setErr(''); setInfo(''); }}
              >
                {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
