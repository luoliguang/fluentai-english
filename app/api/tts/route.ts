import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text' }, { status: 400 })

  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey || apiKey === 'your_siliconflow_api_key_here') {
    return NextResponse.json({ error: 'SILICONFLOW_API_KEY not configured' }, { status: 500 })
  }

  const res = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'FunAudioLLM/CosyVoice2-0.5B',
      input: text,
      voice: 'FunAudioLLM/CosyVoice2-0.5B:anna',
      response_format: 'mp3',
      speed: 1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('SiliconFlow TTS error:', err)
    return NextResponse.json({ error: 'TTS failed' }, { status: res.status })
  }

  const audioBuffer = await res.arrayBuffer()
  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
      'Cache-Control': 'no-store',
    },
  })
}
