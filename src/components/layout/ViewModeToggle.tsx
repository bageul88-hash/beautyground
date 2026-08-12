import { IconDesktop, IconMobile } from '../common/Icon'
import type { ViewMode } from '../../lib/viewMode'

interface Props {
  mode: ViewMode
  onToggle: () => void
}

// 화면 좌측에 고정된 PC/모바일 전환 탭. 평시 기본은 모바일이고, 이 버튼으로만 PC버전 전환.
export default function ViewModeToggle({ mode, onToggle }: Props) {
  const isDesktop = mode === 'desktop'
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-1.5 bg-ink text-paper px-1.5 py-3 text-[11px] font-bold tracking-wide"
      aria-label={isDesktop ? '모바일 버전으로 보기' : 'PC 버전으로 보기'}
    >
      {isDesktop ? <IconMobile className="w-4 h-4" /> : <IconDesktop className="w-4 h-4" />}
      <span style={{ writingMode: 'vertical-rl' }}>{isDesktop ? '모바일' : 'PC버전'}</span>
    </button>
  )
}
