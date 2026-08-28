'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Microphone, BookOpen, SignOut } from '@phosphor-icons/react'
import { useSession, signOut } from 'next-auth/react'
import { useI18n } from '@/lib/i18nContext'

export default function Sidebar() {
  const pathname = usePathname()
  const { t, lang, toggleLang } = useI18n()
  const { data: session } = useSession()

  const navItems = [
    { href: '/',           label: t.home,     icon: <House size={16} weight="regular" /> },
    { href: '/practice',   label: t.practice, icon: <Microphone size={16} weight="regular" /> },
    { href: '/vocabulary', label: t.wordBank,  icon: <BookOpen size={16} weight="regular" /> },
  ]

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User'
  const userInitial = userName[0].toUpperCase()

  return (
    <div className="hidden md:flex w-[220px] flex-shrink-0 flex-col h-full" style={{ background: '#060b17', borderRight: '1px solid #1a2540' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-7">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#f59e0b' }}>
          <Microphone size={18} weight="regular" color="#0a0f1e" />
        </div>
        <span className="text-[18px] font-extrabold tracking-tight" style={{ color: '#f9fafb' }}>
          Fluent<span style={{ color: '#f59e0b' }}>AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] transition-colors"
              style={{
                background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: active ? '#f59e0b' : '#6b7280',
              }}
            >
              <span style={{ color: active ? '#f59e0b' : '#6b7280' }}>{item.icon}</span>
              <span className={`text-[13.5px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 pb-5 flex flex-col gap-2" style={{ borderTop: '1px solid #1a2540' }}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center justify-between px-3 py-2 rounded-[10px] w-full transition-opacity hover:opacity-80"
          style={{ background: '#111827', border: '1px solid #1f2937' }}>
          <span className="text-[12px] font-semibold" style={{ color: '#9ca3af' }}>语言 / Language</span>
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: '#0a0f1e' }}>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors"
              style={{ background: lang === 'zh' ? '#f59e0b' : 'transparent', color: lang === 'zh' ? '#0a0f1e' : '#6b7280' }}>
              中
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors"
              style={{ background: lang === 'en' ? '#f59e0b' : 'transparent', color: lang === 'en' ? '#0a0f1e' : '#6b7280' }}>
              EN
            </span>
          </div>
        </button>

        {/* Profile + logout */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: '#f9fafb' }}>{userName}</div>
            <div className="text-[11px]" style={{ color: '#6b7280' }}>Intermediate · B1</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="退出登录"
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{ color: '#4b5563' }}>
            <SignOut size={14} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  )
}
