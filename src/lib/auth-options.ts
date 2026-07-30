import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { verifyUserCredentials, findUserByEmail, createUser, findUserById } from '@/lib/db'

const hasGoogleConfig =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

const providers = hasGoogleConfig
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: 'select_account',
          },
        },
      }),
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null
          }
          return verifyUserCredentials(credentials.email, credentials.password)
        },
      }),
    ]
  : [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null
          }
          return verifyUserCredentials(credentials.email, credentials.password)
        },
      }),
    ]

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
      }

      if (account?.provider === 'google' && profile) {
        try {
          const googleUser = await findUserByEmail(
            (profile as { email: string }).email
          )
          if (!googleUser) {
            const newUser = await createUser({
              email: (profile as { email: string; name?: string; picture?: string }).email,
              name: (profile as { name?: string }).name,
              image: (profile as { picture?: string }).picture,
              password: null,
            })
            token.id = newUser.id
          } else {
            token.id = googleUser.id
          }
        } catch (err) {
          console.error('Google auth error:', err)
        }
      }

      if (token.id) {
        const dbUser = await findUserById(token.id as string)
        if (dbUser) {
          token.subscriptionPlan = dbUser.subscriptionPlan
          token.subscriptionStatus = dbUser.subscriptionStatus
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as { id: string }).id = token.id as string
        ;(session.user as { subscriptionPlan: string }).subscriptionPlan = token.subscriptionPlan as string
        ;(session.user as { subscriptionStatus: string | null }).subscriptionStatus = token.subscriptionStatus as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
