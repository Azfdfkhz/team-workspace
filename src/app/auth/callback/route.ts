import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const errDesc = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  const nextParam = url.searchParams.get('next') ?? '/';
  const safeNext = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (errDesc) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errDesc)}`, url.origin));
  }

  const sb = createClient();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent('Tautan masuk tidak valid atau sudah kedaluwarsa.'), url.origin),
  );
}

