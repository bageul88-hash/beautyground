import { IconDesktop, IconMobile } from '../common/Icon'
import type { ViewMode } from '../../lib/viewMode'
import { useIsAdmin } from '../../lib/useIsAdmin'

interface Props {
  mode: ViewMode
  onToggle: () => void
}

// 화면 좌측에 고정된 PC/모바일 전환 탭 — 검수·관리용 도구라 관리자 로그인 시에만 노출한다
// (2026-08-13 대표님 지시: "구매 고객은 버튼이 보이면 안 되는데"). 일반 고객은 화면 폭으로
// 자동 판별(폰=모바일, PC=PC버전)되므로 이 버튼이 없어도 항상 맞는 버전을 본다.
export default function ViewModeToggle({ mode, onToggle }: Props) {
  const { isAdmin } = useIsAdmin()
  if (!isAdmin) return null

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
