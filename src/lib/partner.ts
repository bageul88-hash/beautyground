import { supabase } from './supabase'
import type { Partner } from './types'

// 현재 로그인한 사용자의 브랜드(partner) 레코드 조회 (없으면 null)
// user id 는 getSession()(로컬 세션, 네트워크 없음)으로 얻는다 — getUser()는 매번 네트워크
// 검증이라 동시 호출 시 일시적으로 null이 떨어지는 문제가 있다(host.ts의 getMyHost()와 동일 이유).
export async function getMyPartner(): Promise<Partner | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null

  const { data } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as Partner | null) ?? null
}

// 브랜드 본인의 수출 소개글+인증+수출국가+MOQ 저장 (update_my_partner_export_details RPC,
// supabase/partners_export_details.sql — update_my_partner_export_pitch를 대체)
export async function updateMyExportDetails(details: {
  pitch: string
  certifications: string[]
  countries: string
  moqNotes: string
}): Promise<Partner> {
  const { data, error } = await supabase.rpc('update_my_partner_export_details', {
    p_pitch: details.pitch,
    p_certifications: details.certifications,
    p_countries: details.countries,
    p_moq_notes: details.moqNotes,
  })
  if (error) throw error
  return data as Partner
}

// 브랜드 본인 소유 상품의 "수출 대표상품" 표시 토글 (set_my_product_export_featured RPC,
// supabase/products_export_featured.sql)
export async function setMyProductExportFeatured(productId: string, featured: boolean) {
  const { error } = await supabase.rpc('set_my_product_export_featured', {
    p_product_id: productId,
    p_featured: featured,
  })
  if (error) throw error
}
