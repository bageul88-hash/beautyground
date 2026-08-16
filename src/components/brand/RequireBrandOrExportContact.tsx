import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getMyBrandAccess } from '../../lib/partner'

// /brand/export 전용 라우트 가드 — RequireBrand(판매 파트너만)와 달리 수출 전용 계정
// (export_contacts)도 통과시킨다. 대시보드/판매내역/정산내역은 여전히 RequireBrand만 쓰므로
// 수출 전용 계정에서는 접근 불가.
export default function RequireBrandOrExportContact() {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let active = true
    getMyBrandAccess().then(({ partner }) => {
      if (active) { setAllowed(!!partner); setLoading(false) }
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

  if (!allowed) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}
