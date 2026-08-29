import { create } from 'zustand'
import { Message, Word } from './types'

type Updater<T> = T | ((prev: T) => T)
const apply = <T>(prev: T, fn: Updater<T>): T =>
  typeof fn === 'function' ? (fn as (p: T) => T)(prev) : fn

interface PracticeStore {
  messages: Message[]
  sessionWords: Word[]
  pendingWords: Word[]
  sessionTime: number
  translations: Record<string, string>
  ttsVoice: string
  asrModel: string

  setMessages: (fn: Updater<Message[]>) => void
  setSessionWords: (fn: Updater<Word[]>) => void
  setPendingWords: (fn: Updater<Word[]>) => void
  setSessionTime: (fn: Updater<number>) => void
  setTranslations: (fn: Updater<Record<string, string>>) => void
  setTtsVoice: (voice: string) => void
  setAsrModel: (model: string) => void
}

export const usePracticeStore = create<PracticeStore>((set) => ({
  messages: [],
  sessionWords: [],
  pendingWords: [],
  sessionTime: 0,
  translations: {},
  ttsVoice: 'FunAudioLLM/CosyVoice2-0.5B:anna',
  asrModel: 'FunAudioLLM/SenseVoiceSmall',

  setMessages: (fn) => set((s) => ({ messages: apply(s.messages, fn) })),
  setSessionWords: (fn) => set((s) => ({ sessionWords: apply(s.sessionWords, fn) })),
  setPendingWords: (fn) => set((s) => ({ pendingWords: apply(s.pendingWords, fn) })),
  setSessionTime: (fn) => set((s) => ({ sessionTime: apply(s.sessionTime, fn) })),
  setTranslations: (fn) => set((s) => ({ translations: apply(s.translations, fn) })),
  setTtsVoice: (voice) => set({ ttsVoice: voice }),
  setAsrModel: (model) => set({ asrModel: model }),
}))
