import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useIsAdmin } from '../../lib/useIsAdmin'

// 라이브 라우트 접근 통제 — 관리자만 실제 라이브 화면.
// 온라인몰에 라이브커머스를 아예 노출하지 않기로 해(2026-07-31) 그 외에는
// "준비 중" 안내조차 띄우지 않고 홈으로 조용히 돌려보낸다 — 이 안내 문구 자체가
// 라이브커머스의 존재를 알리는 노출이었기 때문.
export default function LiveGate({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useIsAdmin()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중...
      </div>
    )
  }

  return isAdmin ? <>{children}</> : <Navigate to="/app/home" replace />
}
