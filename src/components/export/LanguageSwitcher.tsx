import { useState } from 'react'
import { LANGS, type Lang } from '../../lib/exportI18n'

// /export 계열 페이지 GNB 우측에 들어가는 언어 전환 버튼. GNB의 extra 슬롯으로 전달.
export default function LanguageSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-control border border-rule"
      >
        <span aria-hidden>🌐</span>
        {LANGS.find((l) => l.code === lang)?.label ?? lang}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 bg-paper border border-rule rounded-card shadow-lg overflow-hidden z-50">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                  l.code === lang ? 'bg-quiet text-ink font-semibold' : 'text-ink-soft hover:bg-quiet'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
