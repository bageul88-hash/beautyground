import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

// 수출 전용 계정 가입 — /brand/register(판매 파트너 계정)와 별개의 완전히 분리된 로그인을
// 만든다. 이 계정으로 로그인하면 대시보드/판매내역/정산내역은 안 보이고 "수출 소개"만 접근
// 가능(supabase/export_contacts.sql, BrandLayout.tsx의 isExportOnly 분기).
export default function BrandExportRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [brandName, setBrandName] = useState<string | null>(null)
  const [loadingSlot, setLoadingSlot] = useState(true)
  const [slotValid, setSlotValid] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoadingSlot(false); return }
    let active = true
    ;(async () => {
      const { data: slot } = await supabase
        .from('export_contacts')
        .select('id,partner_id')
        .eq('id', id)
        .is('user_id', null)
        .maybeSingle()
      if (!active) return
      if (!slot) { setSlotValid(false); setLoadingSlot(false); return }
      setSlotValid(true)
      const { data: brand } = await supabase.from('partner_brands').select('brand_name').eq('id', slot.partner_id).maybeSingle()
      if (active) { setBrandName((brand as { brand_name: string } | null)?.brand_name ?? null); setLoadingSlot(false) }
    })()
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

    const { error: claimError } = await supabase.rpc('claim_export_contact_by_id', { p_id: id })
    setSubmitting(false)
    if (claimError) {
      setError(`가입 처리 실패: ${claimError.message}`)
      return
    }
    navigate('/brand/export')
  }

  return (
    <>
      <GNB />
      <main className="py-20 md:py-28" style={{ backgroundColor: '#f7f4ef' }}>
        <div className="max-w-[420px] mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-gold text-[13px] font-medium tracking-widest uppercase mb-3 block">
              EXPORT ACCOUNT SIGN UP
            </span>
            <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-text">
              수출 담당자 가입
            </h1>
            <p className="text-[13px] text-text-sub mt-2">
              이 계정은 "수출 소개" 화면만 이용할 수 있습니다. 판매실적·정산 정보는 보이지 않습니다.
            </p>
          </div>

          <div
            className="bg-white rounded-md p-6 md:p-8 border"
            style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
          >
            {loadingSlot ? (
              <p className="text-center text-[14px] text-text-hint">확인 중…</p>
            ) : !id || !slotValid ? (
              <div className="text-center">
                <p className="text-[14px] text-[#FF4757] mb-2">유효하지 않거나 이미 사용된 가입링크입니다.</p>
                <p className="text-[12.5px] text-text-hint">뷰티그라운드 담당자에게 새 링크를 요청해 주세요.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="text-center pb-4 mb-2 border-b" style={{ borderColor: '#e5e0d8' }}>
                  <p className="text-[12px] text-text-hint mb-1">가입 대상 브랜드</p>
                  <p className="text-[17px] font-bold text-text">{brandName ?? '-'}</p>
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
