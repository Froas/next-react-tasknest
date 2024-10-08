// src/pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("Send a request to FastAPI:", "http://localhost:8000/users/token");
          console.log(process.env.NEXTAUTH_SECRET)
          const formData = new URLSearchParams();
          formData.append('username', credentials?.username || '');
          formData.append('password', credentials?.password || '');
      
          const response = await axios.post("http://127.0.0.1:8000/users/token", formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
      
          const user = response.data;
      
          if (user && user.access_token) {
            return {
              id: credentials?.username,
              access_token: user.access_token,
              ...user,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.log(error);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 4
  },
  jwt: {
    maxAge: 60 * 60 * 4,
    secret: process.env.NEXTAUTH_SECRET, 
  },
  callbacks: {
    async jwt({ token, user }) {

      if (user) {
        token.accessToken = user.access_token;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {

      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
