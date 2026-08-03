import { useEffect, useState } from 'react'

export type ViewMode = 'mobile' | 'desktop'

const KEY = 'bg_view_mode'

function readStored(): ViewMode {
  if (typeof window === 'undefined') return 'mobile'
  const qp = new URLSearchParams(window.location.search).get('view')
  if (qp === 'desktop' || qp === 'mobile') {
    window.localStorage.setItem(KEY, qp)
    return qp
  }
  const v = window.localStorage.getItem(KEY)
  return v === 'desktop' ? 'desktop' : 'mobile'
}

// 평시 기본값은 모바일. 사용자가 PC버전 버튼으로 명시적으로 전환했거나 ?view= 링크로 들어온 경우에만
// localStorage에 남겨 다음 방문에도 유지한다.
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
