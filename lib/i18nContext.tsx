'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { zh, en, Translations } from './i18n'

type Lang = 'zh' | 'en'

interface I18nCtx {
  t: Translations
  lang: Lang
  toggleLang: () => void
}

const I18nContext = createContext<I18nCtx>({ t: zh, lang: 'zh', toggleLang: () => {} })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fluentai_lang') as Lang
      if (saved === 'zh' || saved === 'en') setLang(saved)
    } catch {}
  }, [])

  const toggleLang = () => {
    const next: Lang = lang === 'zh' ? 'en' : 'zh'
    setLang(next)
    try { localStorage.setItem('fluentai_lang', next) } catch {}
  }

  return (
    <I18nContext.Provider value={{ t: lang === 'zh' ? zh : en, lang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
