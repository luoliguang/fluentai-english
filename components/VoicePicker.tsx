'use client'
import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check, SpeakerHigh } from '@phosphor-icons/react'

export interface VoiceOption {
  id: string
  label: string
}

interface VoicePickerProps {
  options: VoiceOption[]
  value: string
  onChange: (value: string) => void
}

export default function VoicePicker({ options, value, onChange }: VoicePickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.id === value)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen(open => !open)}
        className="flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors hover:border-amber-500/40"
        style={{
          background: 'var(--surface-1)',
          borderColor: open ? 'rgba(244,166,42,0.42)' : 'var(--border-soft)',
          color: 'var(--ink-secondary)',
        }}
      >
        <SpeakerHigh size={16} weight="regular" color="var(--accent)" />
        <span className="min-w-0 flex-1 truncate">
          {selected?.label || '选择朗读声音'}
        </span>
        <CaretDown
          size={14}
          weight="bold"
          color="var(--ink-dim)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-2 flex max-h-64 w-full min-w-[260px] flex-col gap-1 overflow-y-auto rounded-xl border p-2 shadow-xl"
          style={{
            background: 'var(--surface-1)',
            borderColor: 'var(--border)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
          }}
        >
          {options.map(option => {
            const active = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background: active ? 'var(--accent-hover)' : 'transparent',
                  color: active ? 'var(--accent-text)' : 'var(--ink-muted)',
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {active && <Check size={15} weight="bold" color="var(--accent)" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
