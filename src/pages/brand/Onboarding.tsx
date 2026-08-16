import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'
import { getMyBrandAccess } from '../../lib/partner'

// 새 브랜드 온보딩 — OTP 로그인 후 연결된 브랜드가 없는 계정이 브랜드명을 입력해 시작한다(셀프 가입).
// create_my_export_brand RPC가 partners에 status='pending'으로 생성 → 관리자 승인(active) 전까지
// 바이어 카탈로그·미니페이지에 노출되지 않는다. 편집기는 바로 사용 가능.
export default function BrandOnboarding() {
  const navigate = useNavigate()
  const [brandName, setBrandName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { navigate('/brand/login'); return }
      const { partner, isExportOnly } = await getMyBrandAccess()
      if (!active) return
      if (partner) { navigate(isExportOnly ? '/brand/export' : '/brand/dashboard'); return }
      setChecking(false)
    })()
    return () => { active = false }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const name = brandName.trim()
    if (name.length < 1) { setError('브랜드명을 입력해 주세요.'); return }
    setSubmitting(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('create_my_export_brand', { p_brand_name: name })
    if (rpcError) {
      setSubmitting(false)
      setError(rpcError.message?.includes('이미') ? rpcError.message : '브랜드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    navigate('/brand/export')
  }

  if (checking) {
    return (
      <>
        <GNB />
        <main className="py-28 text-center text-[13px] text-text-sub" style={{ backgroundColor: '#f7f4ef' }}>
          확인 중…
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <GNB />
      <main className="py-20 md:py-28" style={{ backgroundColor: '#f7f4ef' }}>
        <div className="max-w-[420px] mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-gold text-[13px] font-medium tracking-widest uppercase mb-3 block">WELCOME</span>
            <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-text">브랜드 시작하기</h1>
            <p className="text-[13px] text-text-sub mt-3 leading-relaxed">
              브랜드명만 입력하면 수출 페이지 작성을 바로 시작할 수 있습니다.
              <br />
              작성 완료 후 뷰티그라운드 검수를 거쳐 해외 바이어에게 공개됩니다.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-md p-6 md:p-8 border"
            style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="brandName" className="block text-[13px] font-medium text-text mb-1.5">브랜드명</label>
                <input
                  id="brandName" type="text" required autoFocus maxLength={40}
                  value={brandName} onChange={(e) => setBrandName(e.target.value)}
                  placeholder="예: 셀인펙트"
                  className="w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition"
                />
              </div>
              {error && <p className="text-[13px] text-[#FF4757]" role="alert">{error}</p>}
              <Button type="submit" variant="gold" size="md" disabled={submitting} className="w-full"
                label={submitting ? '생성 중…' : '수출 페이지 만들기'} />
              <p className="text-center text-[12px] text-text-sub pt-1">
                이미 뷰티그라운드에 입점한 브랜드라면 담당자에게 계정 연결을 요청해 주세요.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
