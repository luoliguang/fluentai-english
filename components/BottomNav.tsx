'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Microphone, BookOpen, UserCircle } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18nContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  const items = [
    { href: '/',           label: t.home,    Icon: House },
    { href: '/practice',   label: t.practice, Icon: Microphone },
    { href: '/vocabulary', label: t.wordBank, Icon: BookOpen },
    { href: '/profile',    label: '我的',    Icon: UserCircle },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden flex items-center justify-around"
      style={{ background: '#060b17', borderTop: '1px solid #1a2540', height: '60px', zIndex: 50 }}>
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-1 flex-1 py-2">
            <Icon size={22} weight={active ? 'fill' : 'regular'} color={active ? '#f59e0b' : '#6b7280'} />
            <span className="text-[10px] font-semibold" style={{ color: active ? '#f59e0b' : '#6b7280' }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
