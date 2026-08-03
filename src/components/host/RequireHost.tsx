import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getMyHost } from '../../lib/host'

// 진행자(라이브 호스트) 전용 라우트 가드.
// RequireHostAuth(로그인 여부)만으로는 일반 쇼핑 고객도 URL로 /host/* 에 직접 접근해
// 페이지 껍데기가 열렸었기에, hosts 테이블에 본인 레코드가 실제로 있는지 한 번 더 확인한다.
// 진행자가 아니면 쇼핑몰 홈으로 돌려보낸다.
export default function RequireHost() {
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    let active = true
    getMyHost().then((h) => {
      if (active) { setIsHost(!!h); setLoading(false) }
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

  if (!isHost) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
