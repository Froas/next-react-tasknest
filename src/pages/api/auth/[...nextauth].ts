// src/pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import axios from "axios";

// This runs on the Next.js server, so it can reach FastAPI directly. Do not
// use NEXT_PUBLIC_API_URL here: its same-origin `/backend` value is intended
// for browser code and is not an absolute URL on the server.
const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000';
const configuredSessionTtl = Number(process.env.NEXTAUTH_SESSION_TTL_SECONDS);
const SESSION_TTL_SECONDS = Number.isFinite(configuredSessionTtl) && configuredSessionTtl > 0
 ? configuredSessionTtl
 : 60 * 60 * 24 * 30;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type BackendTokenPair = {
 access_token: string;
 refresh_token: string;
 token_type: string;
 expires_in: number;
};

async function refreshAccessToken(token: JWT): Promise<JWT> {
 if (!token.refreshToken) {
 return { ...token, error: "RefreshAccessTokenError" };
 }

 try {
 const response = await axios.post<BackendTokenPair>(`${API_BASE_URL}/users/refresh`, {
 refresh_token: token.refreshToken,
 });
 const refreshed = response.data;
 return {
 ...token,
 accessToken: refreshed.access_token,
 accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
 refreshToken: refreshed.refresh_token,
 error: undefined,
 };
 } catch (error) {
 const status = axios.isAxiosError(error) ? error.response?.status : undefined;
 console.error(`NextAuth token refresh failed${status ? ` (${status})` : ""}`);
 return { ...token, error: "RefreshAccessTokenError" };
 }
}

export default NextAuth({
 providers: [
 CredentialsProvider({
 name:"Credentials",
 credentials: {
 username: { label:"Username", type:"text" },
 password: { label:"Password", type:"password" },
 },
 async authorize(credentials) {
 try {
 const formData = new URLSearchParams();
 formData.append('username', credentials?.username || '');
 formData.append('password', credentials?.password || '');

 const response = await axios.post(`${API_BASE_URL}/users/token`, formData, {
 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
 });

 const user = response.data as BackendTokenPair;

 if (user && user.access_token) {
 return {
 id: credentials?.username || "authenticated-user",
 ...user,
 };
 }
 return null;
 } catch (error) {
 console.error('NextAuth authorize failed:', error);
 return null;
 }
 },
 }),
 ],
 session: {
 strategy:"jwt",
 maxAge: SESSION_TTL_SECONDS,
 },
 jwt: {
 maxAge: SESSION_TTL_SECONDS,
 secret: process.env.NEXTAUTH_SECRET,
 },
 callbacks: {
 async jwt({ token, user }) {
 if (user) {
 token.accessToken = user.access_token;
 token.accessTokenExpires = Date.now() + user.expires_in * 1000;
 token.refreshToken = user.refresh_token;
 token.id = user.id;
 token.error = undefined;
 return token;
 }

 if (
 token.accessTokenExpires &&
 Date.now() < token.accessTokenExpires - ACCESS_TOKEN_REFRESH_BUFFER_MS
 ) {
 return token;
 }

 return refreshAccessToken(token);
 },
 async session({ session, token }) {
 session.accessToken = token.accessToken as string | undefined;
 session.error = token.error;
 return session;
 },
 },
 pages: {
 signIn:"/login",
 },
});
