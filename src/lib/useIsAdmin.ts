import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// 현재 로그인 사용자가 관리자(app_admins 등록 이메일)인지 판별.
// DB의 is_admin() 함수를 호출한다(supabase/admin_lockdown.sql 실행 후 동작).
// 함수가 아직 없거나 비로그인이면 false(= 손님 취급, 준비중 노출) — fail-closed.
export function useIsAdmin(): { loading: boolean; isAdmin: boolean } {
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean }>({
    loading: true,
    isAdmin: false,
  })

  useEffect(() => {
    let active = true
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return
      setState({ loading: false, isAdmin: !error && data === true })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}
