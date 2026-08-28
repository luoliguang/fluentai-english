import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'No text' }, { status: 400 })

    const res = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是翻译助手。将用户的英文直接翻译成自然流畅的中文，只输出译文，不要解释、不要引号。' },
        { role: 'user', content: text },
      ],
      max_tokens: 300,
      temperature: 0.3,
    })

    return NextResponse.json({ translation: res.choices[0].message.content })
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
