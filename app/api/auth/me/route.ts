import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server-auth';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request, true);
  return NextResponse.json({ user });
}
