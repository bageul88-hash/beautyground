import { useEffect, useRef, useState } from 'react'

// DESIGN.md 확정 팔레트 — PPT "테마 색"처럼 기본색 그리드를 먼저 보여주고,
// 필요할 때만 직접 헥스값을 입력하게 해서 관리자가 브랜드 팔레트 밖으로
// (예: 예전 골드처럼) 벗어나는 걸 자연스럽게 막는다.
const PRESET_COLORS = [
  { label: '화이트', value: '#FFFFFF' },
  { label: '잉크', value: '#17181C' },
  { label: '잉크(보조)', value: '#5B5E66' },
  { label: '잉크(연함)', value: '#8E9199' },
  { label: '룰', value: '#E3E5E9' },
  { label: '콰이엇', value: '#F4F5F7' },
  { label: '시그널 레드', value: '#E60012' },
  { label: '시그널 블루', value: '#0047FF' },
  { label: '시그널 옐로', value: '#FFD400' },
]

interface ColorSwatchPickerProps {
  value: string
  onChange: (hex: string) => void
  label: string
}

export default function ColorSwatchPicker({ value, onChange, label }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false)
  const [customHex, setCustomHex] = useState(value)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    setCustomHex(value)
  }, [value])

  const pick = (hex: string) => {
    onChange(hex)
    setOpen(false)
  }

  const applyCustom = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(customHex)) {
      onChange(customHex)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-[42px] border border-rule rounded-control cursor-pointer"
        style={{ backgroundColor: value }}
        aria-label={`${label} 선택 (현재 ${value})`}
        aria-expanded={open}
      />
      {open && (
        <div className="absolute z-30 top-[46px] left-0 bg-paper border border-rule p-3 w-[192px]">
          <p className="text-[11px] font-bold text-ink-soft mb-2 tracking-[0.04em]">기본색</p>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {PRESET_COLORS.map((c) => {
              const selected = value.toUpperCase() === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => pick(c.value)}
                  title={c.label}
                  aria-label={c.label}
                  className="w-6 h-6 rounded-control"
                  style={{
                    backgroundColor: c.value,
                    border: selected ? '2px solid #17181C' : '1px solid #E3E5E9',
                  }}
                />
              )
            })}
          </div>
          <p className="text-[11px] font-bold text-ink-soft mb-1.5 tracking-[0.04em]">직접 입력</p>
          <div className="flex gap-1.5">
            <input
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
              placeholder="#000000"
              className="flex-1 min-w-0 border border-rule rounded-control px-2 py-1.5 text-[12px] text-ink bg-paper focus:outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="rounded-control bg-ink text-paper text-[12px] font-bold px-2.5"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
