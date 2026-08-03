import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getMyPartner } from '../../lib/partner'

// 파트너 전용 라우트 가드.
// RequireAuth(로그인 여부)만으로는 일반 쇼핑 고객도 URL로 /partner/* 에 직접 접근해
// (데이터는 안 보여도) 페이지 껍데기가 열렸었기에, partners 테이블에 본인 레코드가
// 실제로 있는지 한 번 더 확인한다. 파트너가 아니면 쇼핑몰 홈으로 돌려보낸다.
export default function RequirePartner() {
  const [loading, setLoading] = useState(true)
  const [isPartner, setIsPartner] = useState(false)

  useEffect(() => {
    let active = true
    getMyPartner().then((p) => {
      if (active) { setIsPartner(!!p); setLoading(false) }
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

  if (!isPartner) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
