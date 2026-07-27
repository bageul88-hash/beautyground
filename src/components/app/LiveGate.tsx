import type { ReactNode } from 'react'
import { useIsAdmin } from '../../lib/useIsAdmin'
import LiveComingSoon from './LiveComingSoon'

// 라이브 라우트 접근 통제 — 관리자만 실제 라이브 화면, 그 외에는 준비중 안내.
export default function LiveGate({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useIsAdmin()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중...
      </div>
    )
  }

  return isAdmin ? <>{children}</> : <LiveComingSoon />
}
