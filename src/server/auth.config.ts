import type { NextAuthConfig } from "next-auth";

/**
 * Auth config that can run in Edge Runtime (no Node.js dependencies).
 * Used by middleware for session checks.
 * Full auth with db-backed providers lives in auth.ts.
 */
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [], // Added in auth.ts with db access
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
