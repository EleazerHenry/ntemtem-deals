import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SERVICE_UNAVAILABLE } from "@/lib/auth-errors";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});

// Compared against when the email doesn't exist, so a wrong email takes as
// long as a wrong password and accounts can't be discovered by timing.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5l8Q3bB8U5v3pX9Gx1m0nH2kF1Yt7Ha";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        } catch (error) {
          // Surfaces as result.error on the client, so the form can say
          // "try again" instead of blaming the password.
          console.error("authorize: database unavailable", error);
          throw new Error(SERVICE_UNAVAILABLE);
        }
        const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
