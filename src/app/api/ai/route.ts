import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export async function POST(request: Request) {
  try {
    const { prompt, model, temperature, max_tokens } = await request.json() as {
      prompt?: string
      model?: string
      temperature?: number
      max_tokens?: number
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (openai) {
      const response = await openai.chat.completions.create({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 500,
      })

      return NextResponse.json({
        response: response.choices[0]?.message?.content || '',
        model: 'gpt-3.5-turbo',
      })
    }

    console.log('OpenAI not configured, returning mock response')
    return NextResponse.json({
      response: 'AI service not configured. Please set OPENAI_API_KEY.',
      model: 'mock',
    })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
