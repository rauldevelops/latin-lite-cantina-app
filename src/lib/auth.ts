import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing email or password");
          return null;
        }

        const email = (credentials.email as string).toLowerCase();
        console.log("[Auth] Login attempt for:", email);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("[Auth] No user found for email:", email);
          return null;
        }

        if (!user.password) {
          console.log("[Auth] User found but has no password set:", email);
          return null;
        }

        console.log("[Auth] User found, comparing password...");
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          console.log("[Auth] Password mismatch for:", email);
          return null;
        }

        console.log("[Auth] Login successful for:", email);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };        
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;

        // Lookup customerId for CUSTOMER role users
        if (user.role === "CUSTOMER") {
          const customer = await prisma.customer.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });
          if (customer) {
            token.customerId = customer.id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        if (token.role) {
          session.user.role = token.role as UserRole;
        }
        if (token.customerId) {
          session.user.customerId = token.customerId as string;
        }
      }
      return session;
    },
  },
});