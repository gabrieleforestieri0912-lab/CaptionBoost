import { NextResponse } from 'next/server'
import {
  saveSubtitle,
  getUserSubtitles,
  deleteSubtitle,
} from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/get-user'

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subtitles = await getUserSubtitles(user.id)
  return NextResponse.json({ subtitles })
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as {
      videoId?: string
      videoTitle?: string
      videoUrl?: string
      language?: string
      lines?: import('@/lib/types').SubtitleLine[]
      thumbnail?: string
    }
    const { videoId, videoTitle, videoUrl, language, lines, thumbnail } = body

    if (!videoId || !lines) {
      return NextResponse.json(
        { error: 'videoId and lines are required' },
        { status: 400 }
      )
    }

    const result = await saveSubtitle(user.id, {
      videoId,
      videoTitle,
      videoUrl,
      language: language || 'it',
      lines,
      thumbnail,
    })

    return NextResponse.json({ subtitle: result }, { status: 201 })
  } catch (error) {
    console.error('Save subtitle error:', error)
    return NextResponse.json(
      { error: 'Failed to save subtitle' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const subtitleId = searchParams.get('id')

    if (!subtitleId) {
      return NextResponse.json(
        { error: 'Subtitle ID required' },
        { status: 400 }
      )
    }

    const deleted = await deleteSubtitle(subtitleId, user.id)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Subtitle not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete subtitle error:', error)
    return NextResponse.json(
      { error: 'Failed to delete subtitle' },
      { status: 500 }
    )
  }
}
