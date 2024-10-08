import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    access_token: string;
  }

  interface Session {
    accessToken?: string;
  }
}
