import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getMyPartner } from '../../lib/partner'

// 브랜드사 전용 라우트 가드.
// RequireBrandAuth(로그인 여부)만으로는 일반 쇼핑 고객도 URL로 /brand/* 에 직접 접근해
// 페이지 껍데기가 열리므로, partners 테이블에 본인 레코드가 실제로 연결돼 있는지 한 번 더 확인한다.
// (RequireHost.tsx와 동일 패턴)
export default function RequireBrand() {
  const [loading, setLoading] = useState(true)
  const [isBrand, setIsBrand] = useState(false)

  useEffect(() => {
    let active = true
    getMyPartner().then((p) => {
      if (active) { setIsBrand(!!p); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중…
      </div>
    )
  }

  if (!isBrand) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
