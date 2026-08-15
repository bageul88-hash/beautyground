import { supabase } from './supabase'
import type { DeptAccount } from './types'

// 현재 로그인한 사용자의 백화점 담당자 계정 조회 (없으면 null)
// getSession()(로컬 세션, 네트워크 없음) 사용 이유는 getMyHost()/getMyPartner()와 동일.
export async function getMyDeptAccount(): Promise<DeptAccount | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null

  const { data } = await supabase
    .from('dept_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as DeptAccount | null) ?? null
}

export const DEPT_NAMES: Record<DeptAccount['dept_key'], string> = {
  hyundai: '현대백화점',
  ak: 'AK플라자',
}
