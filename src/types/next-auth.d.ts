import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      subscriptionPlan: string
      subscriptionStatus: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface JWT {
    subscriptionPlan: string
    subscriptionStatus: string | null
  }
}
