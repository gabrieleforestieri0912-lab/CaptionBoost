import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSupabase } from './supabase'
import type { User, UserWithoutPassword, Subtitle, Feedback, SubtitleLine } from './types'

function sanitizeUser(user: User): UserWithoutPassword {
  const { password, verificationTokens, ...rest } = user
  return rest
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single()

  if (error || !data) return null
  return data as User
}

export async function findUserById(id: string): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as User
}

export async function createUser({
  email,
  password,
  name,
  image,
}: {
  email: string
  password: string | null
  name?: string | null
  image?: string | null
}): Promise<UserWithoutPassword> {
  const existing = await findUserByEmail(email)
  if (existing) {
    throw new Error('User already exists with this email')
  }

  const hashedPassword = password ? await bcrypt.hash(password, 12) : null

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name: name || null,
      image: image || null,
      password: hashedPassword,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return sanitizeUser(data as User)
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<UserWithoutPassword | null> {
  const user = await findUserByEmail(email)
  if (!user || !user.password) return null

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return null

  return sanitizeUser(user)
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'password' | 'verificationTokens'>>
): Promise<UserWithoutPassword | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return null
  return sanitizeUser(data as User)
}

export async function updateUserPassword(
  id: string,
  newPassword: string
): Promise<UserWithoutPassword | null> {
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return null
  return sanitizeUser(data as User)
}

export async function updateUserLastLogin(
  id: string
): Promise<UserWithoutPassword | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .update({ lastLoginAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) return null
  return sanitizeUser(data as User)
}

export async function createVerificationToken(
  userId: string,
  type: string
): Promise<{ code: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const user = await findUserById(userId)
  if (!user) throw new Error('User not found')

  const tokens = (user.verificationTokens || []).filter(
    (t) => t.type !== type
  )
  tokens.push({ type, code, expiresAt })

  const supabase = getSupabase()
  const { error } = await supabase
    .from('users')
    .update({ verificationTokens: tokens })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  return { code }
}

export async function verifyVerificationToken(
  userId: string,
  code: string,
  type: string
): Promise<boolean> {
  const user = await findUserById(userId)
  if (!user || !user.verificationTokens) return false

  const tokenIndex = user.verificationTokens.findIndex(
    (t) => t.type === type && t.code === code
  )

  if (tokenIndex === -1) return false

  const token = user.verificationTokens[tokenIndex]
  const supabase = getSupabase()

  if (new Date(token.expiresAt) < new Date()) {
    const tokens = user.verificationTokens.filter((_, i) => i !== tokenIndex)
    await supabase
      .from('users')
      .update({ verificationTokens: tokens })
      .eq('id', userId)
    return false
  }

  const tokens = user.verificationTokens.filter((_, i) => i !== tokenIndex)
  await supabase
    .from('users')
    .update({ verificationTokens: tokens })
    .eq('id', userId)

  return true
}

export async function generateToken(
  user: { id: string; email: string; name?: string | null }
): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not configured')
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: '30d' }
  )
}

export async function verifyToken(
  token: string
): Promise<{ id: string; email: string; name?: string } | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) throw new Error('NEXTAUTH_SECRET is not configured')
    return jwt.verify(token, secret) as { id: string; email: string; name?: string }
  } catch {
    return null
  }
}

export async function saveFeedback(
  userId: string | null,
  { type, message, rating }: { type: string; message: string; rating?: number | null }
): Promise<Feedback> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      userId: userId || 'anonymous',
      type: type || 'general',
      message,
      rating: rating || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Feedback
}

export async function saveSubtitle(
  userId: string,
  {
    videoId,
    videoTitle,
    videoUrl,
    language,
    lines,
    thumbnail,
  }: {
    videoId: string
    videoTitle?: string
    videoUrl?: string
    language?: string
    lines?: SubtitleLine[]
    thumbnail?: string
  }
): Promise<Subtitle> {
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('subtitles')
    .select('*')
    .eq('userId', userId)
    .eq('videoId', videoId)
    .eq('language', language || 'it')
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('subtitles')
      .update({
        lines: lines || [],
        language: language || 'it',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', (existing as Subtitle).id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Subtitle
  }

  const { data, error } = await supabase
    .from('subtitles')
    .insert({
      userId,
      videoId,
      videoTitle: videoTitle || 'Untitled Video',
      videoUrl: videoUrl || '',
      language: language || 'it',
      lines: lines || [],
      thumbnail: thumbnail || '',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Subtitle
}

export async function getUserSubtitles(userId: string): Promise<Subtitle[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subtitles')
    .select('*')
    .eq('userId', userId)
    .order('updatedAt', { ascending: false })

  if (error || !data) return []
  return data as Subtitle[]
}

export async function getSubtitleById(
  subtitleId: string
): Promise<Subtitle | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subtitles')
    .select('*')
    .eq('id', subtitleId)
    .single()

  if (error || !data) return null
  return data as Subtitle
}

export async function deleteSubtitle(
  subtitleId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('subtitles')
    .delete()
    .eq('id', subtitleId)
    .eq('userId', userId)

  return !error
}
