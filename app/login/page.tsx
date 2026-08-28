'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Microphone, CircleNotch } from '@phosphor-icons/react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error); return }
      }

      const result = await signIn('credentials', {
        email, password, redirect: false,
      })

      if (result?.error) {
        setError('邮箱或密码错误')
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0f1e' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: '#f59e0b' }}>
            <Microphone size={20} weight="bold" color="#0a0f1e" />
          </div>
          <span className="text-[22px] font-extrabold tracking-tight" style={{ color: '#f9fafb' }}>
            Fluent<span style={{ color: '#f59e0b' }}>AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: '#f9fafb' }}>
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-sm mb-7" style={{ color: '#6b7280' }}>
            {mode === 'login' ? '登录继续你的英语学习' : '注册开始你的英语学习之旅'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: '#9ca3af' }}>昵称</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="你的名字"
                  className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                  style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
                />
              </div>
            )}

            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: '#9ca3af' }}>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: '#9ca3af' }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
              />
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              style={{ background: '#f59e0b', color: '#0a0f1e' }}>
              {loading && <CircleNotch size={15} weight="bold" className="animate-spin" />}
              {mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#6b7280' }}>
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="font-semibold ml-1"
              style={{ color: '#f59e0b' }}>
              {mode === 'login' ? '注册' : '登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
