import { useEffect, useState } from 'react'
import { IconArrowUp } from './Icon'

// 상세페이지처럼 스크롤이 긴 화면에서 재사용하는 "맨 위로" 플로팅 버튼.
// 하단 sticky 바(구매 바 등)와 겹치지 않도록 bottom 오프셋은 사용처에서 조절.
export default function ScrollToTopButton({ bottomOffset = '9.5rem' }: { bottomOffset?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed left-0 right-0 z-50 pointer-events-none"
      style={{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom))` }}
    >
      <div className="max-w-[480px] mx-auto px-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
          className="pointer-events-auto w-11 h-11 rounded-pill bg-paper border border-rule shadow-card flex items-center justify-center text-ink focus:outline-none focus-visible:shadow-ring"
        >
          <IconArrowUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
