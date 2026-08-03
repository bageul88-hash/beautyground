import { useEffect, useState } from 'react'

export type ViewMode = 'mobile' | 'desktop'

const KEY = 'bg_view_mode'
const DESKTOP_MIN_WIDTH = 1024

function detectByWidth(): ViewMode {
  if (typeof window === 'undefined') return 'mobile'
  return window.innerWidth >= DESKTOP_MIN_WIDTH ? 'desktop' : 'mobile'
}

function readStored(): ViewMode {
  if (typeof window === 'undefined') return 'mobile'
  const qp = new URLSearchParams(window.location.search).get('view')
  if (qp === 'desktop' || qp === 'mobile') {
    window.localStorage.setItem(KEY, qp)
    return qp
  }
  const v = window.localStorage.getItem(KEY)
  if (v === 'desktop' || v === 'mobile') return v
  return detectByWidth()
}

// 사용자가 PC버전 버튼으로 명시적으로 전환했거나 ?view= 링크로 들어온 경우엔 그 값을 다음 방문에도 유지한다.
// 아직 한 번도 선택한 적 없는 첫 방문(localStorage 없음)은 실제 화면 너비로 자동 판별한다 —
// PC 화면 너비(1024px 이상)로 들어오면 모바일 배너가 늘어나 보이는 대신 PC버전이 바로 뜬다.
export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(readStored)

  useEffect(() => {
    window.localStorage.setItem(KEY, mode)
  }, [mode])

  return {
    mode,
    isDesktop: mode === 'desktop',
    toggle: () => setMode((m) => (m === 'desktop' ? 'mobile' : 'desktop')),
  }
}
