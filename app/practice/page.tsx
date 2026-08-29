'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type BrowserSpeechEvent = {
  resultIndex?: number
  results: ArrayLike<{ 0: { transcript: string } }>
}

type BrowserSpeechErrorEvent = {
  error?: string
}

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: BrowserSpeechEvent) => void) | null
  onerror: ((event: BrowserSpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): BrowserSpeechRecognition }
    webkitSpeechRecognition?: { new (): BrowserSpeechRecognition }
  }
}
import { Clock, ArrowRight, Keyboard, Microphone, Stop, X, BookmarkSimple, WarningCircle, AirplaneTakeoff, Desktop, ForkKnife, FilmSlate, GearSix, CircleNotch, ChatCircleDots } from '@phosphor-icons/react'
import Sidebar from '@/components/Sidebar'
import { Message, Word } from '@/lib/types'
import { parseWords, parseCorrections, renderContent, createWord } from '@/lib/wordBank'
import { useI18n } from '@/lib/i18nContext'
import { usePracticeStore } from '@/lib/usePracticeStore'


const TOPICS = [
  { icon: <AirplaneTakeoff size={18} weight="regular" color="#a5b4fc" />, zh: '旅游', en: "Let's talk about travel! I'd love to practice describing places I want to visit." },
  { icon: <Desktop size={18} weight="regular" color="#6ee7b7" />, zh: '科技', en: "I want to discuss technology and how AI is changing our daily lives." },
  { icon: <ForkKnife size={18} weight="regular" color="#fca5a5" />, zh: '美食', en: "Let's talk about food! I can describe my favorite dishes." },
  { icon: <FilmSlate size={18} weight="regular" color="#fcd34d" />, zh: '电影', en: "I'd like to talk about movies or TV shows I've been watching recently." },
]

export default function PracticePage() {
  const { t, lang } = useI18n()
  const {
    messages, setMessages,
    sessionWords, setSessionWords,
    pendingWords, setPendingWords,
    sessionTime, setSessionTime,
    translations, setTranslations,
    ttsVoice, setTtsVoice,
    asrModel, setAsrModel,
  } = usePracticeStore()
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [translating, setTranslating] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [sfModels, setSfModels] = useState<{ asr: {id:string,label:string}[], tts: {id:string,label:string}[] }>({ asr: [], tts: [] })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const recordingStateRef = useRef(false)
  const speechTranscriptRef = useRef('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTime((s: number) => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [setSessionTime])

  useEffect(() => {
    fetch('/api/sf-models').then(r => r.json()).then(setSfModels).catch(() => {})
  }, [])

  useEffect(() => {
    if (showTextInput) textInputRef.current?.focus()
  }, [showTextInput])


  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'assistant',
        content: t.lunaOpening,
        displayContent: t.lunaOpening,
        words: [],
        corrections: [],
        timestamp: Date.now(),
      }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      displayContent: userText,
      words: [],
      corrections: [],
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsThinking(true)

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: userText })

    const streamId = (Date.now() + 1).toString()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) throw new Error('API error')

      const placeholderMsg: Message = {
        id: streamId,
        role: 'assistant',
        content: '',
        displayContent: '',
        words: [],
        corrections: [],
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, placeholderMsg])
      setIsThinking(false)
      setIsStreaming(true)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payload = part.slice(6)
          if (payload === '[DONE]') break
          try {
            const { text } = JSON.parse(payload)
            if (text) {
              fullContent += text
              setMessages(prev => prev.map(m =>
                m.id === streamId
                  ? { ...m, content: fullContent, displayContent: renderContent(fullContent) }
                  : m
              ))
            }
          } catch {}
        }
      }

      const cleanExample = fullContent.replace(/\[WORD:[^\]]+\]/g, '').replace(/\[CORRECTION:[^\]]+\]/g, '').trim()
      const words = parseWords(fullContent, cleanExample)
      const corrections = parseCorrections(fullContent)

      setMessages(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: fullContent, displayContent: renderContent(fullContent), words, corrections }
          : m
      ))

      if (words.length > 0) setPendingWords(words)

      const cleanText = fullContent
        .replace(/\[WORD:([^:]+):[^\]]+\]/g, '$1')
        .replace(/\[CORRECTION:[^\]]+\]/g, '')
        .trim()
      speakText(cleanText)

      // 自动翻译（后台静默执行，点击"显示翻译"时立即呈现）
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      }).then(r => r.json()).then(data => {
        if (data.translation) setTranslations((prev: Record<string, string>) => ({ ...prev, [streamId]: data.translation }))
      }).catch(() => {})

    } catch (err) {
      console.error(err)
      setIsThinking(false)
      const errMsg: Message = {
        id: streamId,
        role: 'assistant',
        content: t.apiError,
        displayContent: t.apiError,
        words: [],
        corrections: [],
        timestamp: Date.now(),
      }
      setMessages(prev => {
        const has = prev.find(m => m.id === streamId)
        return has ? prev.map(m => m.id === streamId ? errMsg : m) : [...prev, errMsg]
      })
    } finally {
      setIsStreaming(false)
    }
  }, [messages, t.apiError])

  const sendMessageRef = useRef<typeof sendMessage>(sendMessage)
  sendMessageRef.current = sendMessage

  const stopSpeakingAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsSpeaking(false)
  }

  const speakText = async (text: string) => {
    stopSpeakingAudio()
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: ttsVoice }),
      })
      if (!res.ok) { setIsSpeaking(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = 1
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); setIsSpeaking(false) }
      audio.onerror = () => { URL.revokeObjectURL(url); setIsSpeaking(false) }
      audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setShowTextInput(true)
      return
    }
    stopSpeakingAudio()
    recordingStateRef.current = true
    speechTranscriptRef.current = ''
    setTranscript('')

    // SpeechRecognition for real-time interim display only
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.lang = 'en-US'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (e: BrowserSpeechEvent) => {
        const nextTranscript = Array.from(e.results)
          .map(result => result[0].transcript)
          .join('')
          .trim()
        speechTranscriptRef.current = nextTranscript
        setTranscript(nextTranscript)
      }
      rec.onerror = (event: BrowserSpeechErrorEvent) => {
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error ?? '')) {
          recognitionRef.current = null
        }
      }
      rec.onend = () => {
        if (recordingStateRef.current && recognitionRef.current === rec) {
          try { rec.start() } catch {}
        }
      }
      recognitionRef.current = rec
      try { rec.start() } catch {}
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' })
        setIsRecording(false)
        setIsTranscribing(true)
        setTranscript('')
        try {
          const fd = new FormData()
          fd.append('file', blob, 'recording.webm')
          fd.append('model', asrModel)
          const res = await fetch('/api/asr', { method: 'POST', body: fd })
          const data = await res.json()
          const text = (data.text ?? speechTranscriptRef.current).trim()
          if (text) await sendMessageRef.current?.(text)
        } catch (e) {
          console.error('ASR error', e)
        } finally {
          setIsTranscribing(false)
          setTranscript('')
        }
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
    } catch {
      recordingStateRef.current = false
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setShowTextInput(true)
    }
  }, [asrModel])

  const stopRecording = useCallback(() => {
    recordingStateRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    mediaRecorderRef.current?.stop()
  }, [])

  const handleSendText = () => {
    const text = textInput.trim()
    if (!text || isBusy) return
    sendMessage(text)
    setTextInput('')
  }

  const handleSaveWord = async (word: Word) => {
    const saved = await createWord(word)
    if (!saved) return
    setSessionWords(prev => {
      if (prev.find(w => w.word === saved.word)) return prev
      return [saved, ...prev]
    })
    setPendingWords(prev => prev.filter(w => w.word !== word.word))
  }

  const dismissWord = (word: string) => {
    setPendingWords(prev => prev.filter(w => w.word !== word))
  }

  const stopSpeaking = stopSpeakingAudio

  const handleTranslate = async (msgId: string, text: string) => {
    if (translations[msgId] || translating) return
    setTranslating(msgId)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.translation) setTranslations(prev => ({ ...prev, [msgId]: data.translation }))
    } finally {
      setTranslating(null)
    }
  }

  const isBusy = isThinking || isStreaming || isTranscribing
  const isOpening = messages.length <= 1

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--canvas)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-3.5 md:py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[18px] font-black"
              style={{ background: 'var(--luna)', color: 'white' }}>
              L
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#f9fafb' }}>Luna</div>
              <div className="text-xs flex items-center gap-1.5 font-medium" style={{ color: '#10b981' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {t.lunaStatus}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{ background: '#111827', borderColor: '#1f2937', color: '#9ca3af' }}>
              <Clock size={14} weight="regular" color="#6b7280" />
              {formatTime(sessionTime)}
            </div>
            {sessionWords.length > 0 && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                {t.wordsSaved(sessionWords.length)}
              </div>
            )}
            <button
              onClick={() => setShowSettings(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
              style={{
                background: showSettings ? 'rgba(245,158,11,0.1)' : '#111827',
                borderColor: showSettings ? 'rgba(245,158,11,0.3)' : '#1f2937',
              }}>
              <GearSix size={16} weight={showSettings ? 'fill' : 'regular'} color={showSettings ? '#f59e0b' : '#6b7280'} />
            </button>
          </div>
        </div>

        {/* Settings panel — TTS only (ASR model configured by admin in Profile) */}
        {showSettings && (
          <div className="flex-shrink-0 px-4 md:px-7 py-3 flex flex-col gap-2 border-b" style={{ background: '#080d1a', borderColor: '#1a2540' }}>
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#4b5563' }}>朗读声音</label>
            <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}
              className="text-xs rounded-lg px-3 py-2 border outline-none max-w-xs"
              style={{ background: '#111827', borderColor: '#1f2937', color: '#d1d5db' }}>
              {sfModels.tts.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-5 md:py-8 flex flex-col gap-5">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse self-end max-w-[68%]' : 'max-w-[82%]'}`}>
              <div className={`w-8 h-8 flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5 ${
                msg.role === 'assistant' ? 'rounded-[9px]' : 'rounded-full'}`}
                style={msg.role === 'assistant'
                  ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }
                  : { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                {msg.role === 'assistant' ? 'L' : 'G'}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="px-4 py-3 text-sm leading-relaxed"
                  style={{
                    background: msg.role === 'assistant' ? '#111827' : '#15284a',
                    border: `1px solid ${msg.role === 'assistant' ? '#1f2937' : '#1e3d6e'}`,
                    borderRadius: msg.role === 'assistant' ? '14px 14px 14px 3px' : '14px 14px 3px 14px',
                    color: '#e5e7eb',
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{ __html: msg.displayContent.replace(
                    /<span class="word-highlight" data-word="([^"]+)">([^<]+)<\/span>/g,
                    '<span style="background:rgba(245,158,11,0.18);color:#fcd34d;border-radius:4px;padding:1px 5px;font-weight:700;cursor:pointer">$2</span>'
                  )}}
                />

                {/* 语法纠错 */}
                {msg.role === 'assistant' && msg.corrections.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 mt-2 rounded-xl p-3 border"
                    style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(239,68,68,0.12)' }}>
                      <WarningCircle size={14} weight="regular" color="#f87171" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#f87171' }}>
                        {t.correctionTitle}
                      </div>
                      <div className="text-xs flex items-center flex-wrap gap-1.5 mb-1">
                        <span style={{ color: '#6b7280' }}>{t.correctionYouSaid}</span>
                        <span className="line-through" style={{ color: '#f87171' }}>&ldquo;{c.wrong}&rdquo;</span>
                        <ArrowRight size={14} weight="regular" color="#4b5563" />
                        <span style={{ color: '#34d399' }}>&ldquo;{c.right}&rdquo;</span>
                      </div>
                      <div className="text-[11px]" style={{ color: '#9ca3af' }}>{c.explanation}</div>
                    </div>
                  </div>
                ))}

                {/* 词汇弹卡 */}
                {msg.role === 'assistant' && pendingWords.filter(w =>
                  msg.content.includes(`[WORD:${w.word}:`)).map(word => (
                  <div key={word.word} className="flex items-center gap-3 mt-2 rounded-xl p-3 border"
                    style={{ background: '#0e1528', borderColor: '#252d50' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(245,158,11,0.12)' }}>
                      <BookmarkSimple size={14} weight="regular" color="#f59e0b" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-extrabold" style={{ color: '#fcd34d' }}>{word.word}</span>
                        {word.phonetic && <span className="text-[11px] italic" style={{ color: '#6b7280' }}>{word.phonetic}</span>}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#1f2937', color: '#6b7280' }}>{word.pos}</span>
                      </div>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9ca3af' }}>{word.definition}</p>
                      {word.definitionZh && <p className="text-xs mt-0.5 leading-snug font-medium" style={{ color: '#6b7280' }}>{word.definitionZh}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleSaveWord(word)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                        {t.saveWord}
                      </button>
                      <button onClick={() => dismissWord(word.word)}
                        className="px-2 py-1.5 rounded-lg"
                        style={{ color: '#6b7280' }}>
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[11px]" style={{ color: '#4b5563' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleTranslate(msg.id, msg.content.replace(/\[WORD:[^\]]+\]/g, '').replace(/\[CORRECTION:[^\]]+\]/g, '').trim())}
                      className="text-[11px] font-medium transition-opacity hover:opacity-70"
                      style={{ color: translating === msg.id ? '#6b7280' : translations[msg.id] ? '#4b5563' : '#f59e0b' }}>
                      {translating === msg.id ? '翻译中…' : translations[msg.id] ? '已翻译' : '显示翻译'}
                    </button>
                  )}
                </div>
                {translations[msg.id] && (
                  <div className="mt-1.5 mx-1 px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.15)' }}>
                    {translations[msg.id]}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 话题建议卡片（仅开场时显示） */}
          {isOpening && !isBusy && (
            <div className="mt-2">
              <p className="text-[12px] font-semibold mb-3 px-0.5" style={{ color: '#4b5563' }}>
                {t.topicsTitle}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {TOPICS.map(topic => (
                  <button
                    key={topic.zh}
                    onClick={() => sendMessage(topic.en)}
                    className="flex items-center gap-2.5 rounded-xl px-4 py-3 border text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
                    style={{ background: '#111827', borderColor: '#1f2937' }}
                  >
                    <span className="flex-shrink-0">{topic.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: '#d1d5db' }}>
                      {lang === 'zh' ? topic.zh : topic.en.split('!')[0].replace("Let's talk about ", '').replace("I want to discuss ", '').replace("I'd like to talk about ", '')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex gap-2.5 max-w-[60%]">
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0 text-[14px] font-black"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white' }}>
                L
              </div>
              <div className="px-4 py-3 rounded-[14px] rounded-bl-[3px] flex items-center gap-1.5"
                style={{ background: '#111827', border: '1px solid #1f2937' }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#6b7280', animation: `wave-bar 1s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 md:px-7 pb-20 md:pb-6 pt-4 flex-shrink-0" style={{ borderTop: '1px solid #1a2540', background: '#060b17' }}>
          <div className="flex items-center gap-3">

            {showTextInput ? (
              /* 文字输入模式 */
              <>
                <input
                  ref={textInputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder={t.typeHint}
                  disabled={isBusy}
                  className="flex-1 rounded-2xl px-4 py-3.5 text-sm border outline-none transition-colors disabled:opacity-50"
                  style={{
                    background: '#111827',
                    borderColor: '#1f2937',
                    color: '#e5e7eb',
                  }}
                />
                <button
                  onClick={handleSendText}
                  disabled={isBusy || !textInput.trim()}
                  className="px-5 py-3.5 rounded-2xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#f59e0b', color: '#0a0f1e' }}>
                  {t.send}
                </button>
              </>
            ) : (
              /* 语音输入模式 */
              <div className="flex-1 rounded-2xl px-4 py-3.5 flex items-center gap-3 border transition-colors"
                style={{
                  background: '#111827',
                  borderColor: isRecording ? '#f59e0b' : '#1f2937',
                  borderWidth: isRecording ? '1.5px' : '1px',
                }}>
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-0.5 h-7 flex-shrink-0">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="wave-bar w-[3px] rounded-full" style={{ background: '#f59e0b' }} />
                      ))}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium max-h-10 overflow-y-auto leading-relaxed" style={{ color: transcript ? '#f9fafb' : '#f59e0b' }}>
                        {transcript || t.listening}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ef4444', animation: 'pulse 1s infinite' }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>{t.recording}</span>
                      </div>
                    </div>
                  </>
                ) : isTranscribing ? (
                  <>
                    <CircleNotch size={18} weight="bold" color="#6366f1" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    <span className="flex-1 text-sm" style={{ color: '#a5b4fc' }}>识别中…</span>
                  </>
                ) : isSpeaking ? (
                  <>
                    <div className="flex items-center gap-0.5 h-7 flex-shrink-0">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="wave-bar w-[3px] rounded-full" style={{ background: '#a5b4fc' }} />
                      ))}
                    </div>
                    <span className="flex-1 text-sm" style={{ color: '#9ca3af' }}>{t.lunaSpeaking}</span>
                    <button onClick={stopSpeaking} className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: '#6b7280', background: '#1f2937' }}>
                      停止
                    </button>
                  </>
                ) : (
                  <span className="text-sm" style={{ color: '#4b5563' }}>
                    {isBusy ? t.lunaThinking : t.tapMicHint}
                  </span>
                )}
              </div>
            )}

            {/* 语音 / 文字切换按钮 */}
            <button
              onClick={() => setShowTextInput(v => !v)}
              title={showTextInput ? t.switchToVoice : t.switchToText}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors hover:border-amber-500/40"
              style={{ background: '#111827', borderColor: '#1f2937' }}>
              {showTextInput
                ? <Microphone size={16} weight="regular" color="#9ca3af" />
                : <Keyboard size={16} weight="regular" color="#9ca3af" />
              }
            </button>

            {/* 麦크风 / 停止按钮（文字模式下隐藏） */}
            {!showTextInput && (
              <div className="relative flex-shrink-0">
                {isRecording && (
                  <div className="pulse-ring absolute inset-[-10px] rounded-full border"
                    style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }} />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isBusy}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all relative z-10 disabled:opacity-50"
                  style={{ background: isRecording ? '#ef4444' : '#f59e0b' }}>
                  {isRecording
                    ? <Stop size={18} weight="fill" color="white" />
                    : <Microphone size={20} weight="regular" color="#0a0f1e" />
                  }
                </button>
              </div>
            )}
          </div>

          {/* 底部提示：仅录音时显示，避免重复 */}
          {isRecording && (
            <p className="text-[11px] mt-2 px-0.5" style={{ color: '#374151' }}>
              {t.tapStopHint}
            </p>
          )}
        </div>
      </div>

      {/* 移动端浮动单词角标 */}
      {sessionWords.length > 0 && (
        <div className="fixed bottom-[72px] right-4 md:hidden z-40">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
            style={{ background: '#f59e0b', color: '#0a0f1e' }}>
            <BookmarkSimple size={13} weight="fill" color="#0a0f1e" />
            {sessionWords.length}
          </div>
        </div>
      )}

      {/* 学习反馈侧栏（仅桌面端） */}
      <div className="hidden lg:flex w-[260px] flex-shrink-0 flex-col" style={{ background: 'var(--surface-3)', borderLeft: '1px solid var(--border)' }}>
        <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <ChatCircleDots size={16} weight="fill" color="var(--accent)" />
            <h3 className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{t.learningFeedback}</h3>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{t.learningFeedbackDesc}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-1)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-dim)' }}>时间</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>{formatTime(sessionTime)}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-1)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-dim)' }}>新词</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--accent)' }}>{pendingWords.length}</div>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-dim)' }}>{t.sessionWordsTitle}</span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-faint)' }}>{sessionWords.length}</span>
          </div>
          {sessionWords.length === 0 ? (
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)' }}>
              <BookmarkSimple size={17} weight="regular" color="var(--ink-dim)" className="mb-2" />
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
              {t.noSessionWords}
              </p>
            </div>
          ) : (
            sessionWords.map(w => (
              <div key={w.id} className="rounded-xl p-3 border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-soft)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13.5px] font-bold" style={{ color: 'var(--accent-text)' }}>{w.word}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-dim)' }}>{w.pos}</span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: 'var(--ink-muted)' }}>{w.definition}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
