import { Word, Correction } from './types'

const STORAGE_KEY = 'fluentai_words'

export function getWords(): Word[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWord(word: Omit<Word, 'id' | 'savedAt' | 'mastery'>): Word {
  const words = getWords()
  const exists = words.find(w => w.word.toLowerCase() === word.word.toLowerCase())
  if (exists) return exists

  const newWord: Word = {
    ...word,
    id: Date.now().toString(),
    savedAt: Date.now(),
    mastery: 0,
  }
  words.unshift(newWord)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  return newWord
}

export function updateMastery(id: string, mastery: number) {
  const words = getWords()
  const idx = words.findIndex(w => w.id === id)
  if (idx !== -1) {
    words[idx].mastery = mastery
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
  }
}

export function deleteWord(id: string) {
  const words = getWords().filter(w => w.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
}

// 解析 [WORD:word:phonetic:pos:definition] 标签
export function parseWords(content: string, example: string): Word[] {
  const regex = /\[WORD:([^:]+):([^:]*):([^:]+):([^\]]+)\]/g
  const words: Word[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    words.push({
      id: Date.now().toString() + Math.random(),
      word: match[1].trim(),
      phonetic: match[2].trim(),
      pos: match[3].trim(),
      definition: match[4].trim(),
      example,
      savedAt: Date.now(),
      mastery: 0,
    })
  }
  return words
}

// 解析 [CORRECTION:wrong→right:中文说明] 标签
// 支持 → 或 -> 两种箭头
export function parseCorrections(content: string): Correction[] {
  const regex = /\[CORRECTION:([^→\->]+)[→\->]+([^:]+):([^\]]+)\]/g
  const corrections: Correction[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    corrections.push({
      wrong: match[1].trim(),
      right: match[2].trim(),
      explanation: match[3].trim(),
    })
  }
  return corrections
}

// 将 [WORD:...] 转为高亮 span，去掉 [CORRECTION:...] 标签
export function renderContent(content: string): string {
  return content
    .replace(
      /\[WORD:([^:]+):([^:]*):([^:]+):([^\]]+)\]/g,
      (_, word) => `<span class="word-highlight" data-word="${word}">${word}</span>`
    )
    .replace(/\[CORRECTION:[^\]]+\]/g, '')
    .trim()
}

export function getStats() {
  const words = getWords()
  const mastered = words.filter(w => w.mastery >= 70).length
  const learning = words.filter(w => w.mastery < 70).length
  return { total: words.length, mastered, learning }
}
