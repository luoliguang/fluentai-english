'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { Message, Word } from '@/lib/types'
import { parseWords, parseCorrections, renderContent, saveWord } from '@/lib/wordBank'
import { useI18n } from '@/lib/i18nContext'

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export default function PracticePage() {
  const { t } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [pendingWords, setPendingWords] = useState<Word[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // Luna 开场白（根据语言）
  useEffect(() => {
    const opening: Message = {
      id: '0',
      role: 'assistant',
      content: t.lunaOpening,
      displayContent: t.lunaOpening,
      words: [],
      corrections: [],
      timestamp: Date.now(),
    }
    setMessages([opening])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 流式调用 DeepSeek API
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

    // 历史记录（不含当前用户消息）
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

      // 插入空的流式消息占位
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
              // 实时更新气泡（去掉标签只留文本）
              setMessages(prev => prev.map(m =>
                m.id === streamId
                  ? { ...m, content: fullContent, displayContent: renderContent(fullContent) }
                  : m
              ))
            }
          } catch {}
        }
      }

      // 流结束，解析标签
      const cleanExample = fullContent.replace(/\[WORD:[^\]]+\]/g, '').replace(/\[CORRECTION:[^\]]+\]/g, '').trim()
      const words = parseWords(fullContent, cleanExample)
      const corrections = parseCorrections(fullContent)

      setMessages(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: fullContent, displayContent: renderContent(fullContent), words, corrections }
          : m
      ))

      if (words.length > 0) setPendingWords(words)

      // TTS（去掉所有标签）
      const cleanText = fullContent
        .replace(/\[WORD:([^:]+):[^\]]+\]/g, '$1')
        .replace(/\[CORRECTION:[^\]]+\]/g, '')
        .trim()
      speakText(cleanText)

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
        // 如果占位消息已插入，替换它；否则追加
        const has = prev.find(m => m.id === streamId)
        return has ? prev.map(m => m.id === streamId ? errMsg : m) : [...prev, errMsg]
      })
    } finally {
      setIsStreaming(false)
    }
  }, [messages, t.apiError])

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'
    utter.rate = 0.92
    utter.pitch = 1.05
    utter.onstart = () => setIsSpeaking(true)
    utter.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utter)
  }

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Your browser does not support speech recognition. Please use Chrome.')
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(t)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (transcript.trim()) {
        sendMessage(transcript)
        setTranscript('')
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setTranscript('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setTranscript('')
    window.speechSynthesis?.cancel()
  }, [transcript, sendMessage])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const handleSaveWord = (word: Word) => {
    saveWord(word)
    setSessionWords(prev => {
      if (prev.find(w => w.word === word.word)) return prev
      return [word, ...prev]
    })
    setPendingWords(prev => prev.filter(w => w.word !== word.word))
  }

  const dismissWord = (word: string) => {
    setPendingWords(prev => prev.filter(w => w.word !== word))
  }

  const isBusy = isThinking || isStreaming

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      <Sidebar />

      {/* 主对话区 */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1a2540' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="3" stroke="white" strokeWidth="1.6"/>
                <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b7280" strokeWidth="1.4">
                <circle cx="6" cy="6" r="5"/><path d="M6 3.5V6l1.5 1.5" strokeLinecap="round"/>
              </svg>
              {formatTime(sessionTime)}
            </div>
            {sessionWords.length > 0 && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                {t.wordsSaved(sessionWords.length)}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse self-end max-w-[68%]' : 'max-w-[82%]'}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 flex items-center justify-center text-[13px] font-bold flex-shrink-0 mt-0.5 ${
                msg.role === 'assistant' ? 'rounded-[9px]' : 'rounded-full'}`}
                style={msg.role === 'assistant'
                  ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }
                  : { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                {msg.role === 'assistant'
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="white" strokeWidth="1.4"/><path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  : 'G'}
              </div>

              <div className="flex-1 min-w-0">
                {/* 消息气泡 */}
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

                {/* 语法纠错卡片（固定显示在 assistant 消息下面） */}
                {msg.role === 'assistant' && msg.corrections.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 mt-2 rounded-xl p-3 border"
                    style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(239,68,68,0.12)' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 1v4M6 9v2"/><circle cx="6" cy="6" r="5"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#f87171' }}>
                        {t.correctionTitle}
                      </div>
                      <div className="text-xs flex items-center flex-wrap gap-1.5 mb-1">
                        <span style={{ color: '#6b7280' }}>{t.correctionYouSaid}</span>
                        <span className="line-through" style={{ color: '#f87171' }}>&ldquo;{c.wrong}&rdquo;</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 6h8M7 3l3 3-3 3"/>
                        </svg>
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
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M6.5 1v7M4 3.5l2.5-2.5L9 3.5M2.5 9h8M2.5 12h5"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-extrabold" style={{ color: '#fcd34d' }}>{word.word}</span>
                        {word.phonetic && <span className="text-[11px] italic" style={{ color: '#6b7280' }}>{word.phonetic}</span>}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#1f2937', color: '#6b7280' }}>{word.pos}</span>
                      </div>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: '#9ca3af' }}>{word.definition}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleSaveWord(word)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                        {t.saveWord}
                      </button>
                      <button onClick={() => dismissWord(word.word)}
                        className="px-2 py-1.5 rounded-lg text-xs"
                        style={{ color: '#6b7280' }}>✕</button>
                    </div>
                  </div>
                ))}

                <div className="text-[11px] mt-1 px-1" style={{ color: '#4b5563' }}>
                  {new Date(msg.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking indicator（等待第一个字节时显示） */}
          {isThinking && (
            <div className="flex gap-2.5 max-w-[60%]">
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="white" strokeWidth="1.4"/><path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
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
        <div className="px-7 pb-6 pt-4 flex-shrink-0" style={{ borderTop: '1px solid #1a2540', background: '#060b17' }}>
          <div className="flex items-center gap-3">
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
                    <div className="text-sm italic" style={{ color: transcript ? '#d1d5db' : '#6b7280' }}>
                      {transcript || t.listening}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                      <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>{t.recording}</span>
                    </div>
                  </div>
                </>
              ) : isSpeaking ? (
                <>
                  <div className="flex items-center gap-0.5 h-7 flex-shrink-0">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="wave-bar w-[3px] rounded-full" style={{ background: '#a5b4fc' }} />
                    ))}
                  </div>
                  <span className="text-sm" style={{ color: '#9ca3af' }}>{t.lunaSpeaking}</span>
                </>
              ) : (
                <span className="text-sm" style={{ color: '#4b5563' }}>
                  {isThinking || isStreaming ? t.lunaThinking : t.tapMicHint}
                </span>
              )}
            </div>

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
                {isRecording ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="#fff">
                    <rect x="4" y="4" width="10" height="10" rx="2"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="7" y="2" width="8" height="12" rx="4" fill="#0a0f1e"/>
                    <path d="M4 12a7 7 0 0014 0" stroke="#0a0f1e" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M11 19v2" stroke="#0a0f1e" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className="text-[11px] mt-2 px-0.5" style={{ color: '#374151' }}>
            {isRecording ? t.tapStopHint : t.tapMicHint}
          </p>
        </div>
      </div>

      {/* 本次单词侧边栏 */}
      <div className="w-60 flex-shrink-0 flex flex-col" style={{ background: '#060b17', borderLeft: '1px solid #1a2540' }}>
        <div className="flex items-center justify-between px-4 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #1a2540' }}>
          <h3 className="text-[13px] font-bold" style={{ color: '#f9fafb' }}>{t.sessionWordsTitle}</h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#1f2937', color: '#9ca3af' }}>{sessionWords.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {sessionWords.length === 0 ? (
            <p className="text-[12px] text-center mt-6 leading-relaxed" style={{ color: '#4b5563' }}>
              {t.noSessionWords}
            </p>
          ) : (
            sessionWords.map(w => (
              <div key={w.id} className="rounded-xl p-3 border" style={{ background: '#111827', borderColor: '#1f2937' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13.5px] font-bold" style={{ color: '#fcd34d' }}>{w.word}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: '#1f2937', color: '#6b7280' }}>{w.pos}</span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: '#6b7280' }}>{w.definition}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
