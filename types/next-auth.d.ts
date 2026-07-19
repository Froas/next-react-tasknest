import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }

  interface Session extends DefaultSession {
    accessToken?: string;
    error?: "RefreshAccessTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    id?: string;
    error?: "RefreshAccessTokenError";
  }
}
