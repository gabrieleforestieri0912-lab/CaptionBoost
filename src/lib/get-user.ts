import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { findUserById, verifyToken } from '@/lib/db'
import type { User } from '@/lib/types'

export async function getAuthenticatedUser(
  request?: Request
): Promise<{ user: User | null; session: unknown | null }> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id

  if (userId) {
    const user = await findUserById(userId)
    return { user, session }
  }

  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = await verifyToken(token)
      if (decoded?.id) {
        const user = await findUserById(decoded.id)
        return { user, session: null }
      }
    }
  }

  return { user: null, session: null }
}
