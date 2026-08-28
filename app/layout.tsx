import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18nContext'
import { SessionProvider } from 'next-auth/react'
import PageTransition from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'FluentAI - 英语口语练习',
  description: 'AI 驱动的英语口语与词汇学习平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <SessionProvider>
          <I18nProvider>
            <PageTransition>{children}</PageTransition>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
