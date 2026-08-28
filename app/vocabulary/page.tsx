'use client'
import { useState, useEffect } from 'react'
import { Search, ArrowRight, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { fetchWords, patchMastery, removeWord } from '@/lib/wordBank'
import { Word } from '@/lib/types'
import { useI18n } from '@/lib/i18nContext'

type Filter = 'all' | 'learning' | 'mastered'

export default function VocabularyPage() {
  const { t } = useI18n()
  const [words, setWords] = useState<Word[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchWords().then(setWords)
  }, [])

  const filtered = words.filter(w => {
    const matchSearch = w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.definition.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'mastered' ? w.mastery >= 70 :
      w.mastery < 70
    return matchSearch && matchFilter
  })

  const handleMastery = async (id: string, mastery: number) => {
    await patchMastery(id, mastery)
    setWords(prev => prev.map(w => w.id === id ? { ...w, mastery } : w))
  }

  const handleDelete = async (id: string) => {
    await removeWord(id)
    setWords(prev => prev.filter(w => w.id !== id))
  }

  const masteryLabel = (m: number) => m >= 70 ? t.statusMastered : m > 0 ? t.statusLearning : t.statusNew
  const masteryColor = (m: number) => m >= 70 ? '#10b981' : m > 0 ? '#f59e0b' : '#6b7280'

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t.filterAll },
    { key: 'learning', label: t.filterLearning },
    { key: 'mastered', label: t.filterMastered },
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex-shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#f9fafb' }}>{t.wordBankTitle}</h1>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                {t.wordsStat(words.length, words.filter(w => w.mastery >= 70).length)}
              </p>
            </div>
            {words.length > 0 && (
              <button
                onClick={() => {
                  const learning = words.filter(w => w.mastery < 70)
                  if (learning.length > 0) {
                    const w = learning[Math.floor(Math.random() * learning.length)]
                    alert(`${w.word}\n${w.phonetic}\n\n${w.definition}\n\nExample: ${w.example}`)
                  } else {
                    alert(t.allMastered)
                  }
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: '#f59e0b', color: '#0a0f1e' }}>
                <ArrowRight size={16} strokeWidth={1.5} color="#0a0f1e" />
                {t.quickReview}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 flex-1 max-w-xs border"
              style={{ background: '#111827', borderColor: '#1f2937' }}>
              <Search size={16} strokeWidth={1.5} color="#6b7280" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: '#f9fafb' }}
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: '#111827', borderColor: '#1f2937' }}>
              {filters.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-4 py-1.5 rounded-[9px] text-sm font-semibold transition-colors"
                  style={{
                    background: filter === f.key ? '#f59e0b' : 'transparent',
                    color: filter === f.key ? '#0a0f1e' : '#9ca3af',
                  }}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Word grid */}
        <div className="flex-1 overflow-y-auto px-10 pb-10">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {words.length === 0 ? t.noWordsEmpty : t.noWordsMatch}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map(w => (
                <div key={w.id} className="rounded-2xl p-5 border group"
                  style={{ background: '#111827', borderColor: '#1f2937' }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="text-[17px] font-extrabold tracking-tight" style={{ color: '#f9fafb' }}>{w.word}</div>
                      {w.phonetic && <div className="text-xs italic mt-0.5" style={{ color: '#6b7280' }}>{w.phonetic}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#1f2937', color: '#6b7280' }}>{w.pos}</span>
                      <button onClick={() => handleDelete(w.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#6b7280' }}>
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[12.5px] leading-relaxed my-3" style={{ color: '#9ca3af' }}>{w.definition}</p>

                  {w.example && (
                    <div className="rounded-lg px-3 py-2 mb-3" style={{ background: '#0e1528' }}>
                      <p className="text-[11.5px] leading-relaxed italic" style={{ color: '#6b7280' }}>
                        &ldquo;{w.example.length > 100 ? w.example.slice(0, 100) + '...' : w.example}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: masteryColor(w.mastery) }}>
                      {masteryLabel(w.mastery)}
                    </span>
                    <span className="text-[11px]" style={{ color: '#6b7280' }}>{w.mastery}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${w.mastery}%`, background: masteryColor(w.mastery) }} />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleMastery(w.id, Math.max(0, w.mastery - 20))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                      style={{ background: 'transparent', borderColor: '#374151', color: '#9ca3af' }}>
                      {t.forgot}
                    </button>
                    <button onClick={() => handleMastery(w.id, Math.min(100, w.mastery + 25))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors"
                      style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                      {t.gotIt}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
