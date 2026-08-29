import { NextResponse } from 'next/server'

// Known free audio models on SiliconFlow as fallback
const FALLBACK_ASR = [
  { id: 'FunAudioLLM/SenseVoiceSmall', label: 'SenseVoice Small (快速，多语言)' },
  { id: 'Qwen/Qwen3-ASR-1.7B', label: 'Qwen3-ASR 1.7B (52 语言)' },
  { id: 'Qwen/Qwen3-ASR-0.6B', label: 'Qwen3-ASR 0.6B (轻量)' },
  { id: 'XingChenAGI/XingChenASR-V3.2-Ultra', label: 'XingChen ASR Ultra (中英混合)' },
]

const FALLBACK_TTS = [
  { id: 'FunAudioLLM/CosyVoice2-0.5B:anna', label: 'Anna (英文女)' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:bella', label: 'Bella (英文女)' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:claire', label: 'Claire (英文女)' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:david', label: 'David (英文男)' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:ethan', label: 'Ethan (英文男)' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B:abigail', label: 'Abigail (英文女)' },
]

export async function GET() {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey || apiKey === 'your_siliconflow_api_key_here') {
    return NextResponse.json({ asr: FALLBACK_ASR, tts: FALLBACK_TTS })
  }

  try {
    const res = await fetch('https://api.siliconflow.cn/v1/models?type=audio', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!res.ok) throw new Error('fetch failed')

    const data = await res.json()
    const models: { id: string }[] = data.data ?? []

    const asrKeywords = /asr|sense.?voice|whisper|transcri/i
    const ttsKeywords = /tts|cosyvoice|fish.?speech|speech.*synth/i

    const fetchedAsr = models
      .filter(m => asrKeywords.test(m.id))
      .map(m => ({ id: m.id, label: m.id.split('/').pop() ?? m.id }))

    const fetchedTts = models
      .filter(m => ttsKeywords.test(m.id))
      .map(m => ({ id: m.id, label: m.id.split('/').pop() ?? m.id }))

    return NextResponse.json({
      asr: fetchedAsr.length > 0 ? fetchedAsr : FALLBACK_ASR,
      tts: fetchedTts.length > 0 ? fetchedTts : FALLBACK_TTS,
    })
  } catch {
    return NextResponse.json({ asr: FALLBACK_ASR, tts: FALLBACK_TTS })
  }
}
