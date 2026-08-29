'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Sidebar from '@/components/Sidebar'
import { UserCircle, Lock, SignOut, FloppyDisk, Robot } from '@phosphor-icons/react'
import { usePracticeStore } from '@/lib/usePracticeStore'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const { asrModel, setAsrModel } = usePracticeStore()
  const [name, setName] = useState(session?.user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [sfModels, setSfModels] = useState<{ asr: {id:string,label:string}[], tts: {id:string,label:string}[] }>({ asr: [], tts: [] })

  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/sf-models').then(r => r.json()).then(setSfModels).catch(() => {})
    }
  }, [isAdmin])

  const handleSaveName = async () => {
    if (!name.trim()) return
    setNameSaving(true)
    setNameMsg('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setNameMsg(data.error); return }
      await update({ name: data.name })
      setNameMsg('已保存')
    } finally {
      setNameSaving(false)
    }
  }

  const handleSavePw = async () => {
    setPwSaving(true)
    setPwMsg('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setPwMsg(data.error); return }
      setCurrentPassword('')
      setNewPassword('')
      setPwMsg('密码已更新')
    } finally {
      setPwSaving(false)
    }
  }

  const userInitial = (session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f1e' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-5 md:px-10 py-8 pb-24 md:pb-10">
        <h1 className="text-2xl font-extrabold tracking-tight mb-8" style={{ color: '#f9fafb' }}>我的</h1>

        {/* 头像 + 基本信息 */}
        <div className="flex items-center gap-4 mb-8 p-5 rounded-2xl border" style={{ background: '#111827', borderColor: '#1f2937' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
            {userInitial}
          </div>
          <div>
            <div className="text-[17px] font-bold" style={{ color: '#f9fafb' }}>{session?.user?.name || '未设置昵称'}</div>
            <div className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{session?.user?.email}</div>
            <div className="text-xs mt-1 font-medium px-2 py-0.5 rounded-full inline-block"
              style={{ background: '#1f2937', color: '#9ca3af' }}>Intermediate · B1</div>
          </div>
        </div>

        <div className="flex flex-col gap-5 max-w-md">
          {/* 改昵称 */}
          <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: '#1f2937' }}>
            <div className="flex items-center gap-2 mb-4">
              <UserCircle size={16} weight="regular" color="#9ca3af" />
              <span className="text-sm font-bold" style={{ color: '#f9fafb' }}>修改昵称</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameMsg('') }}
              placeholder="你的昵称"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none mb-3"
              style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
            />
            {nameMsg && (
              <p className="text-xs mb-3" style={{ color: nameMsg === '已保存' ? '#10b981' : '#f87171' }}>{nameMsg}</p>
            )}
            <button onClick={handleSaveName} disabled={nameSaving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#f59e0b', color: '#0a0f1e' }}>
              <FloppyDisk size={14} weight="bold" color="#0a0f1e" />
              {nameSaving ? '保存中…' : '保存'}
            </button>
          </div>

          {/* 改密码 */}
          <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: '#1f2937' }}>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={16} weight="regular" color="#9ca3af" />
              <span className="text-sm font-bold" style={{ color: '#f9fafb' }}>修改密码</span>
            </div>
            <div className="flex flex-col gap-3 mb-3">
              <input
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPwMsg('') }}
                placeholder="当前密码"
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwMsg('') }}
                placeholder="新密码（至少6位）"
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}
              />
            </div>
            {pwMsg && (
              <p className="text-xs mb-3" style={{ color: pwMsg === '密码已更新' ? '#10b981' : '#f87171' }}>{pwMsg}</p>
            )}
            <button onClick={handleSavePw} disabled={pwSaving || !currentPassword || !newPassword}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#f59e0b', color: '#0a0f1e' }}>
              <FloppyDisk size={14} weight="bold" color="#0a0f1e" />
              {pwSaving ? '更新中…' : '更新密码'}
            </button>
          </div>

          {/* 管理员：ASR 模型配置 */}
          {isAdmin && sfModels.asr.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: '#1f2937' }}>
              <div className="flex items-center gap-2 mb-4">
                <Robot size={16} weight="regular" color="#9ca3af" />
                <span className="text-sm font-bold" style={{ color: '#f9fafb' }}>语音识别模型</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>管理员</span>
              </div>
              <select
                value={asrModel}
                onChange={e => setAsrModel(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
                style={{ background: '#0a0f1e', borderColor: '#1f2937', color: '#f9fafb' }}>
                {sfModels.asr.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <p className="text-xs mt-2" style={{ color: '#4b5563' }}>
                仅管理员可配置，影响所有用户的语音识别结果。
              </p>
            </div>
          )}

          {/* 退出登录 */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-opacity hover:opacity-80 w-full justify-center"
            style={{ background: 'transparent', borderColor: '#374151', color: '#9ca3af' }}>
            <SignOut size={16} weight="regular" color="#9ca3af" />
            退出登录
          </button>
        </div>
      </main>
    </div>
  )
}
