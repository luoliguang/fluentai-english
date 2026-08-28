'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, ArrowRight, Keyboard, Microphone, Stop, X, BookmarkSimple, WarningCircle } from '@phosphor-icons/react'
import Sidebar from '@/components/Sidebar'
import { Message, Word } from '@/lib/types'
import { parseWords, parseCorrections, renderContent, createWord } from '@/lib/wordBank'
import { useI18n } from '@/lib/i18nContext'

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

const TOPICS = [
  { emoji: '✈️', zh: '旅游', en: "Let's talk about travel! I'd love to practice describing places I want to visit." },
  { emoji: '💻', zh: '科技', en: "I want to discuss technology and how AI is changing our daily lives." },
  { emoji: '🍜', zh: '美食', en: "Let's talk about food! I can describe my favorite dishes." },
  { emoji: '🎬', zh: '电影', en: "I'd like to talk about movies or TV shows I've been watching recently." },
]

export default function PracticePage() {
  const { t, lang } = useI18n()
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [sessionWords, setSessionWords] = useState<Word[]>([])
  const [pendingWords, setPendingWords] = useState<Word[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef('')          // stale-closure fix
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  useEffect(() => {
    timerRef.current = setInterval(() => setSessionTime(s => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    if (showTextInput) textInputRef.current?.focus()
  }, [showTextInput])

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

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
      setShowTextInput(true)
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(text)
      transcriptRef.current = text
    }

    recognition.onend = () => {
      setIsRecording(false)
      const text = transcriptRef.current
      if (text.trim()) {
        sendMessage(text)
        setTranscript('')
        transcriptRef.current = ''
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
      setTranscript('')
      transcriptRef.current = ''
    }

    recognition.onnomatch = () => {
      setIsRecording(false)
      setTranscript('')
      transcriptRef.current = ''
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setTranscript('')
    transcriptRef.current = ''
    window.speechSynthesis?.cancel()
  }, [sendMessage])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
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

  const isBusy = isThinking || isStreaming
  const isOpening = messages.length <= 1

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1a2540' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px] font-black"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', letterSpacing: '-0.5px' }}>
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
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">
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

                <div className="text-[11px] mt-1 px-1" style={{ color: '#4b5563' }}>
                  {new Date(msg.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                </div>
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
                    <span className="text-xl flex-shrink-0">{topic.emoji}</span>
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
        <div className="px-7 pb-6 pt-4 flex-shrink-0" style={{ borderTop: '1px solid #1a2540', background: '#060b17' }}>
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
