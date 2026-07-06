import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    access_token: string;
  }

  interface Session extends DefaultSession {
    accessToken?: string;
    // Inherits `expires: string` (ISO date) from DefaultSession; we pin its
    // value to our JWT TTL in `pages/api/auth/[...nextauth].ts`.
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    id?: string;
    exp?: number;
  }
}
