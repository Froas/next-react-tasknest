// src/pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SESSION_TTL_SECONDS = 60 * 60 * 4;

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

 const user = response.data;

 if (user && user.access_token) {
 return {
 id: credentials?.username,
 access_token: user.access_token,
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
 token.id = user.id;
 // Pin expiry to the JWT TTL so the client-side expiration watcher
 // logs the user out at the right time, not 30d later.
 token.exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
 }
 return token;
 },
 async session({ session, token }) {
 session.accessToken = token.accessToken as string | undefined;
 if (token.exp) {
 session.expires = new Date((token.exp as number) * 1000).toISOString();
 }
 return session;
 },
 },
 pages: {
 signIn:"/login",
 },
});
