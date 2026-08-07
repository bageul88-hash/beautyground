import { Navigate, Outlet } from 'react-router-dom'
import { useIsAdmin } from '../../lib/useIsAdmin'

// 관리자 전용 라우트 가드. useIsAdmin은 비로그인도 fail-closed(isAdmin=false)로 처리하므로
// 이 컴포넌트 하나로 로그인 여부 + 관리자 여부를 함께 검사한다.
// DB의 is_admin() RPC로 실제 관리자(app_admins 등록 이메일)인지 확인하고,
// 관리자가 아니면 일반 고객 홈으로 돌려보낸다.
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
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
