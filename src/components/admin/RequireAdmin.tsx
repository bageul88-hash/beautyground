import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIsAdmin } from '../../lib/useIsAdmin'

// 관리자 전용 라우트 가드.
// 비로그인과 "로그인했지만 관리자 아님"을 구분한다(2026-09-02).
//   - 예전에는 둘 다 /app/home 으로 보내서, 관리자 주소를 붙여넣으면 왜 홈으로 튕겼는지
//     알 수 없었다(매장 노트북에서 실제로 헤맴).
//   - 비로그인이면 로그인 화면으로 보내고, 로그인이 끝나면 원래 보려던 주소로 되돌린다.
//   - 로그인은 했는데 관리자가 아니면 그대로 고객 홈으로 보낸다.
export default function RequireAdmin() {
  const { loading, isAdmin } = useIsAdmin()
  const location = useLocation()
  const [auth, setAuth] = useState<{ loading: boolean; loggedIn: boolean }>({
    loading: true,
    loggedIn: false,
  })

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setAuth({ loading: false, loggedIn: Boolean(data.session) })
    })
    return () => {
      active = false
    }
  }, [])

  if (loading || auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중…
      </div>
    )
  }

  if (!auth.loggedIn) {
    return (
      <Navigate
        to="/app/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  if (!isAdmin) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
