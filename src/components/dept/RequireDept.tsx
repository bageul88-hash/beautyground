import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getMyDeptAccount } from '../../lib/deptAccount'

// 백화점 담당자 전용 라우트 가드. RequireHost/RequireBrand와 동일 패턴 —
// 로그인만으로는 일반 고객도 URL로 /dept/* 에 직접 접근하므로 dept_accounts 행 실존을 확인.
export default function RequireDept() {
  const [loading, setLoading] = useState(true)
  const [isDept, setIsDept] = useState(false)

  useEffect(() => {
    let active = true
    getMyDeptAccount().then((d) => {
      if (active) { setIsDept(!!d); setLoading(false) }
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

  if (!isDept) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
