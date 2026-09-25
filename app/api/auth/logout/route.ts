import { NextResponse } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/server-auth';

export async function POST() {
  return NextResponse.json(
    { success: true, message: 'Logged out successfully.' },
    {
      status: 200,
      headers: {
        'Set-Cookie': clearSessionCookieHeader(),
      },
    }
  );
}
