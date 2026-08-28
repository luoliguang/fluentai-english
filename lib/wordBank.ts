import { Word, Correction } from './types'

// ─── API 函数（替代 localStorage）───────────────────────────────────────────

export async function fetchWords(): Promise<Word[]> {
  const res = await fetch('/api/words')
  if (!res.ok) return []
  const data = await res.json()
  return data.map((w: Word & { savedAt: string }) => ({
    ...w,
    savedAt: new Date(w.savedAt).getTime(),
  }))
}

export async function createWord(word: Omit<Word, 'id' | 'savedAt' | 'mastery'>): Promise<Word | null> {
  const res = await fetch('/api/words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(word),
  })
  if (!res.ok) return null
  const data = await res.json()
  return { ...data, savedAt: new Date(data.savedAt).getTime() }
}

export async function patchMastery(id: string, mastery: number): Promise<void> {
  await fetch(`/api/words/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mastery }),
  })
}

export async function removeWord(id: string): Promise<void> {
  await fetch(`/api/words/${id}`, { method: 'DELETE' })
}

export async function fetchStats() {
  const words = await fetchWords()
  const mastered = words.filter(w => w.mastery >= 70).length
  const learning = words.filter(w => w.mastery < 70).length
  return { total: words.length, mastered, learning }
}

// ─── 标签解析（保持不变）────────────────────────────────────────────────────

export function parseWords(content: string, example: string): Word[] {
  const regex = /\[WORD:([^:]+):([^:]*):([^:]+):([^:]+):([^\]]*)\]/g
  const words: Word[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    words.push({
      id: Date.now().toString() + Math.random(),
      word: match[1].trim(),
      phonetic: match[2].trim(),
      pos: match[3].trim(),
      definition: match[4].trim(),
      definitionZh: match[5].trim() || undefined,
      example,
      savedAt: Date.now(),
      mastery: 0,
    })
  }
  return words
}

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

export function renderContent(content: string): string {
  return content
    .replace(
      /\[WORD:([^:]+):([^:]*):([^:]+):([^\]]+)\]/g,
      (_, word) => `<span class="word-highlight" data-word="${word}">${word}</span>`
    )
    .replace(/\[CORRECTION:[^\]]+\]/g, '')
    .trim()
}
