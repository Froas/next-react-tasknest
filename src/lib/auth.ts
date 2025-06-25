// src/lib/auth.ts
import NextAuth from 'next-auth';
import { NextRequest } from 'next/server';

export async function getAuthSession(req: NextRequest) {
  const session = await NextAuth.auth({ req });
  return session;
}
