import { Navigate, Outlet } from 'react-router-dom'
import { useIsAdmin } from '../../lib/useIsAdmin'

// 관리자 전용 라우트 가드.
// RequireAuth(로그인 여부)만으로는 일반 파트너도 URL로 /admin/* 에 직접 접근할 수 있었기에,
// DB의 is_admin() RPC로 실제 관리자(app_admins 등록 이메일)인지 한 번 더 확인한다.
// 관리자가 아니면(=일반 파트너) 파트너 대시보드로 돌려보낸다. fail-closed(함수 부재/비로그인 시 차단).
export default function RequireAdmin() {
  const { loading, isAdmin } = useIsAdmin()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중…
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/partner/dashboard" replace />
  }

  return <Outlet />
}
