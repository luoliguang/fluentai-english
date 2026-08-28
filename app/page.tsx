'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Microphone, Fire } from '@phosphor-icons/react'
import Sidebar from '@/components/Sidebar'
import { fetchWords, fetchStats } from '@/lib/wordBank'
import { Word } from '@/lib/types'
import { useI18n } from '@/lib/i18nContext'

export default function Dashboard() {
  const { t } = useI18n()
  const [words, setWords] = useState<Word[]>([])
  const [stats, setStats] = useState({ total: 0, mastered: 0, learning: 0 })

  useEffect(() => {
    fetchWords().then(w => setWords(w.slice(0, 4)))
    fetchStats().then(setStats)
  }, [])

  const masteryColor = (m: number) => m >= 70 ? '#10b981' : '#f59e0b'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col gap-7 p-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#f9fafb' }}>{greeting}</h1>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{t.readyToPractice}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm"
            style={{ background: '#111827', borderColor: '#1f2937' }}>
            <Fire size={18} weight="fill" color="#f59e0b" />
            <div>
              <div className="font-bold text-sm" style={{ color: '#f9fafb' }}>{t.keepItGoing}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{t.practiceDaily}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3.5">
          {[
            { label: t.wordsLearned, value: stats.total, sub: `${stats.mastered} ${t.mastered.toLowerCase()}`, color: '#f9fafb' },
            { label: t.learning, value: stats.learning, sub: t.inProgress, color: '#f59e0b' },
            { label: t.mastered, value: stats.mastered, sub: t.wellDone, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 border" style={{ background: '#111827', borderColor: '#1f2937' }}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#6b7280' }}>{s.label}</div>
              <div className="text-4xl font-extrabold tracking-tighter leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1.5 font-medium" style={{ color: '#6b7280' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-8 flex items-center justify-between border"
          style={{ background: 'linear-gradient(135deg, #111827 0%, #14183a 100%)', borderColor: '#252d50' }}>
          <div>
            <div className="inline-block text-[11px] font-bold uppercase tracking-widest rounded-md px-2.5 py-1 mb-3"
              style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}>{t.todaySession}</div>
            <h2 className="text-xl font-extrabold tracking-tight mb-1.5" style={{ color: '#f9fafb' }}>{t.aiConvPractice}</h2>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: '#9ca3af' }}>{t.aiConvDesc}</p>
          </div>
          <div className="flex items-center gap-5 ml-8 flex-shrink-0">
            <div className="text-center">
              <div className="text-[11px] mb-0.5" style={{ color: '#6b7280' }}>{t.suggested}</div>
              <div className="text-sm font-bold" style={{ color: '#9ca3af' }}>{t.minRange}</div>
            </div>
            <Link href="/practice"
              className="flex items-center gap-2.5 rounded-[14px] px-6 py-3.5 text-sm font-extrabold transition-opacity hover:opacity-90"
              style={{ background: '#f59e0b', color: '#0a0f1e' }}>
              <Microphone size={16} weight="regular" color="#0a0f1e" />
              {t.startSpeaking}
            </Link>
          </div>
        </div>

        {/* Recent Words */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[15px] font-bold" style={{ color: '#f9fafb' }}>{t.recentVocab}</h3>
            <Link href="/vocabulary" className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
              {t.viewAll} {stats.total} →
            </Link>
          </div>

          {words.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: '#111827', borderColor: '#1f2937' }}>
              <p className="text-sm" style={{ color: '#6b7280' }}>{t.noWordsYet}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {words.map(w => (
                <div key={w.id} className="rounded-2xl p-4 border" style={{ background: '#111827', borderColor: '#1f2937' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: '#f9fafb' }}>{w.word}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: '#6b7280', background: '#1f2937' }}>{w.pos}</span>
                  </div>
                  <p className="text-xs leading-relaxed mb-2.5" style={{ color: '#9ca3af' }}>{w.definition}</p>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1f2937' }}>
                    <div className="h-full rounded-full" style={{ width: `${w.mastery}%`, background: masteryColor(w.mastery) }} />
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
