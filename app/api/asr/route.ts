import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey || apiKey === 'your_siliconflow_api_key_here') {
    return NextResponse.json({ error: 'SILICONFLOW_API_KEY not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as Blob | null
  const model = (formData.get('model') as string) || 'FunAudioLLM/SenseVoiceSmall'

  if (!file) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

  const sf = new FormData()
  sf.append('file', file, 'recording.webm')
  sf.append('model', model)

  const res = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: sf,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('SiliconFlow ASR error:', err)
    return NextResponse.json({ error: 'ASR failed' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ text: data.text ?? '' })
}
