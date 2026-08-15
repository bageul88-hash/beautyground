import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'
import type { Partner } from '../../lib/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

// 브랜드 셀프가입 견본(2026-08-15) — 백화점 담당자의 "지점 전용 링크" 방식과 동일한 개념을
// 브랜드에 적용: 관리자가 /admin/partners에서 링크를 발급하면, 그 링크를 여는 브랜드는
// 자기 로고(BI)를 바로 확인하고 이메일·비밀번호만 입력해 가입한다. 아직 실제 운영에 연결하지
// 않은 예시 화면 — 브랜드 포털을 정식으로 열 때 이 흐름을 그대로 쓰면 된다.
export default function BrandRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [slot, setSlot] = useState<Partner | null>(null)
  const [loadingSlot, setLoadingSlot] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoadingSlot(false); return }
    let active = true
    supabase.from('partners').select('*').eq('id', id).is('user_id', null).maybeSingle().then(({ data }) => {
      if (!active) return
      setSlot((data as Partner | null) ?? null)
      setLoadingSlot(false)
    })
    return () => { active = false }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !id) return
    setError(null)

    if (!EMAIL_RE.test(email)) { setError('올바른 이메일 형식을 입력해 주세요.'); return }
    if (!PASSWORD_RE.test(password)) { setError('비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.'); return }

    setSubmitting(true)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setSubmitting(false)
      const msg = signUpError.message.toLowerCase()
      setError(msg.includes('already') || msg.includes('registered') || msg.includes('exists')
        ? '이미 가입된 이메일입니다. 로그인해 주세요.'
        : `가입 실패: ${signUpError.message}`)
      return
    }
    if (!signUpData.user || signUpData.user.identities?.length === 0) {
      setSubmitting(false)
      setError('이미 가입된 이메일입니다. 로그인해 주세요.')
      return
    }

    const { error: claimError } = await supabase.rpc('claim_partner_account_by_id', { p_id: id })
    setSubmitting(false)
    if (claimError) {
      setError(`가입 처리 실패: ${claimError.message}`)
      return
    }
    navigate('/brand/dashboard')
  }

  return (
    <>
      <GNB />
      <main className="py-20 md:py-28" style={{ backgroundColor: '#f7f4ef' }}>
        <div className="max-w-[420px] mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-gold text-[13px] font-medium tracking-widest uppercase mb-3 block">
              BRAND SIGN UP
            </span>
            <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-text">
              브랜드사 가입
            </h1>
          </div>

          <div
            className="bg-white rounded-md p-6 md:p-8 border"
            style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
          >
            {loadingSlot ? (
              <p className="text-center text-[14px] text-text-hint">확인 중…</p>
            ) : !id || !slot ? (
              <div className="text-center">
                <p className="text-[14px] text-[#FF4757] mb-2">유효하지 않거나 이미 사용된 가입링크입니다.</p>
                <p className="text-[12.5px] text-text-hint">뷰티그라운드 담당자에게 새 링크를 요청해 주세요.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 브랜드 로고(BI) — 이게 곧 "이 링크가 우리 브랜드가 맞다"는 확인 */}
                <div className="flex flex-col items-center text-center pb-4 mb-2 border-b" style={{ borderColor: '#e5e0d8' }}>
                  <div className="w-20 h-20 rounded-full bg-[#f7f4ef] border flex items-center justify-center overflow-hidden mb-3" style={{ borderColor: '#e5e0d8' }}>
                    {slot.export_logo_url ? (
                      <img src={slot.export_logo_url} alt={slot.brand_name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[20px] font-bold text-gold">{slot.brand_name.slice(0, 1)}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-hint mb-1">가입 대상 브랜드</p>
                  <p className="text-[17px] font-bold text-text">{slot.brand_name}</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-text mb-1.5">아이디(이메일)</label>
                  <input
                    id="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="brand@company.com"
                    className="w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-text mb-1.5">비밀번호</label>
                  <input
                    id="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상, 영문+숫자+특수문자"
                    className="w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition"
                  />
                </div>

                {error && <p className="text-[13px] text-[#FF4757]" role="alert">{error}</p>}

                <Button
                  type="submit" variant="gold" size="md"
                  label={submitting ? '가입 중…' : '가입하고 시작하기'}
                  disabled={submitting} className="w-full"
                />

                <p className="text-center text-[13px] text-text-sub pt-1">
                  이미 계정이 있으신가요?{' '}
                  <Link to="/brand/login" className="text-gold font-bold hover:underline">로그인</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
