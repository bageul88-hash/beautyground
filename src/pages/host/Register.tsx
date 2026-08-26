import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'

// 010-1234-5678 / 01012345678 → +821012345678 (Supabase phone auth는 E.164 형식 필요)
function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!/^01[0-9]{8,9}$/.test(digits)) return null
  return `+82${digits.slice(1)}`
}

type Step = 'choose' | 'phone-number' | 'phone-code'

export default function HostRegister() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [agree, setAgree] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [agreeError, setAgreeError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // 휴대폰 인증 단계 — Supabase Auth의 네이티브 phone OTP를 그대로 사용한다(signInWithOtp/verifyOtp).
  // ⚠️ Supabase 프로젝트에 SMS Provider(Twilio 등)가 아직 연결 안 되어 있어 지금은 발송 시도 시
  // 에러가 난다 — 대표님이 나중에 문자 서비스를 연결하면 이 화면은 코드 수정 없이 바로 동작한다.
  const [step, setStep] = useState<Step>('choose')
  const [phoneInput, setPhoneInput] = useState('')
  const [code, setCode] = useState('')
  const [phoneSubmitting, setPhoneSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // ⚠️ 이 페이지는 방문할 때마다 항상 카카오/네이버/휴대폰 선택 화면부터 보여준다 —
  // 브라우저에 쇼핑몰 일반회원으로 로그인된 세션이 이미 남아있어도(예: 대표님이 조금 전
  // 다른 쇼핑몰 화면에서 카카오로 로그인해둔 상태) 그 세션을 조용히 재사용해 곧장
  // "이름·연락처만 입력" 화면으로 건너뛰지 않는다 — 섭외 대상이 처음 이 링크를 열었을 때와
  // 똑같은 화면이 항상 나와야 하고, 대표님이 테스트할 때도 매번 버튼 화면부터 보여야 함
  // (2026-08-26 확정). "SESSION_FLAG"는 카카오/네이버 버튼을 실제로 눌러서 그 인증을 마치고
  // 돌아온 경우에만 세팅되므로, 이 값이 있을 때만 기존 세션을 인정하고 다음 단계로 넘어간다.
  const SESSION_FLAG = 'host_join_authed'

  useEffect(() => {
    let active = true
    ;(async () => {
      const justAuthed = sessionStorage.getItem(SESSION_FLAG) === '1'
      sessionStorage.removeItem(SESSION_FLAG)
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!active) return
      if (s && justAuthed) {
        setSession(s)
        const meta = s.user.user_metadata as { name?: string; full_name?: string } | undefined
        const knownName = meta?.name ?? meta?.full_name ?? ''
        if (knownName) setName((prev) => prev || knownName)
        if (s.user.phone) setPhone((prev) => prev || s.user.phone!)
        const { data: existing } = await supabase.from('hosts').select('id').eq('user_id', s.user.id).maybeSingle()
        if (active && existing) { navigate('/host/dashboard', { replace: true }); return }
      }
      if (active) setCheckingSession(false)
    })()
    return () => { active = false }
  }, [navigate])

  const handleKakao = async () => {
    setFormError(null)
    sessionStorage.setItem(SESSION_FLAG, '1')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
        scopes: 'profile_nickname account_email',
      },
    })
    if (error) { sessionStorage.removeItem(SESSION_FLAG); setFormError('카카오 로그인 연결에 실패했습니다. 잠시 후 다시 시도해주세요.') }
  }

  // 네이버 — 일반 회원가입(AppSignup.tsx)과 동일한 커스텀 OAuth 흐름 재사용.
  const handleNaver = () => {
    setFormError(null)
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined
    if (!clientId) {
      setFormError('네이버 로그인이 아직 설정되지 않았습니다.')
      return
    }
    sessionStorage.setItem(SESSION_FLAG, '1')
    const state = crypto.randomUUID()
    sessionStorage.setItem('naver_oauth_state', state)
    sessionStorage.setItem('naver_oauth_from', window.location.pathname)
    const url = new URL('https://nid.naver.com/oauth2.0/authorize')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', `${window.location.origin}/app/auth/naver/callback`)
    url.searchParams.set('state', state)
    window.location.href = url.toString()
  }

  const handleSendCode = async () => {
    setPhoneError(null)
    const e164 = toE164(phoneInput)
    if (!e164) { setPhoneError('휴대폰 번호를 정확히 입력해 주세요. (예: 01012345678)'); return }
    setPhoneSubmitting(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 })
    setPhoneSubmitting(false)
    if (error) {
      setPhoneError('문자 인증 서비스가 아직 준비 중입니다. 카카오 또는 네이버로 가입해 주세요.')
      return
    }
    setStep('phone-code')
  }

  const handleVerifyCode = async () => {
    setPhoneError(null)
    const e164 = toE164(phoneInput)
    if (!e164 || !code.trim()) { setPhoneError('인증번호를 입력해 주세요.'); return }
    setPhoneSubmitting(true)
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' })
    setPhoneSubmitting(false)
    if (error) { setPhoneError('인증번호가 올바르지 않습니다.'); return }
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    setPhone(phoneInput)
    if (s) {
      const { data: existing } = await supabase.from('hosts').select('id').eq('user_id', s.user.id).maybeSingle()
      if (existing) navigate('/host/dashboard', { replace: true })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !session) return
    setFormError(null)
    setNameError(null)
    setAgreeError(null)

    let hasError = false
    if (!name.trim()) { setNameError('이름을 입력하세요.'); hasError = true }
    if (!agree) { setAgreeError('개인정보 수집·이용에 동의해야 합니다.'); hasError = true }
    if (hasError) return

    setSubmitting(true)
    const { error: insertError } = await supabase.from('hosts').insert([
      {
        user_id: session.user.id,
        name: name.trim(),
        phone: phone.trim(),
        email: session.user.email ?? '',
        status: 'pending',
      },
    ])

    if (insertError) {
      setSubmitting(false)
      setFormError(`가입 신청 저장 중 오류가 발생했습니다. (${insertError.message})`)
      return
    }

    setSubmitting(false)
    setDone(true)
  }

  const card = 'bg-white rounded-md p-6 border shadow-[0_4px_24px_rgba(0,0,0,0.05)]'
  const cardBorder = { borderColor: '#e5e0d8', borderWidth: '0.5px' } as const
  const field =
    'w-full bg-white border border-rule rounded-md px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring transition'

  return (
    <>
      <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-6" style={{ backgroundColor: '#f7f4ef' }}>
        <Link to="/" className="font-serif text-[16px] font-bold text-ink mb-5">뷰티그라운드</Link>
        <div className="max-w-[400px] w-full">
          {checkingSession ? (
            <div className="text-center text-[14px] text-ink-faint py-20">불러오는 중...</div>
          ) : done ? (
            <div className={`${card} text-center`} style={cardBorder}>
              <div className="text-5xl mb-4" aria-hidden="true">✅</div>
              <h1 className="font-serif text-[22px] font-bold text-text mb-2">가입 신청이 접수되었습니다</h1>
              <p className="text-[14px] text-text-sub leading-relaxed">승인이 완료되면 진행자센터를 이용하실 수 있습니다.</p>
              <Link
                to="/host/dashboard"
                className="inline-block mt-6 bg-ink text-paper rounded-pill text-[14px] px-6 py-3 font-medium hover:opacity-90 transition-colors"
              >
                진행자센터로 가기
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-serif text-[24px] md:text-[28px] font-bold text-ink leading-snug">
                  라이브 방송 셀러 회원가입
                </h1>
                <p className="text-text-sub text-[13px] mt-1.5">뷰티그라운드 라이브커머스 진행자를 모집합니다</p>
              </div>

              {session ? (
                <form onSubmit={handleSubmit} noValidate className={card} style={cardBorder}>
                  <div className="space-y-3.5">
                    <div className="bg-quiet rounded-md p-3 text-[12.5px] text-ink-soft">
                      로그인됐습니다{session.user.email ? ` (${session.user.email})` : ''}. 이름·연락처만 마저 입력해 주세요.
                    </div>

                    <input
                      value={name} onChange={(e) => { setName(e.target.value); setNameError(null) }}
                      placeholder="이름" className={field}
                    />
                    {nameError && <p className="text-[12px] text-[#FF4757]">{nameError}</p>}

                    <input
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="연락처 (010-0000-0000)" className={field}
                    />

                    <label className="flex items-start gap-2.5 cursor-pointer bg-quiet rounded-md p-3.5" style={{ border: '0.5px solid #E3E5E9' }}>
                      <input
                        type="checkbox" checked={agree}
                        onChange={(e) => { setAgree(e.target.checked); setAgreeError(null) }}
                        className="w-4 h-4 accent-ink mt-0.5"
                      />
                      <span className="text-[12.5px] text-text-sub">
                        <span className="text-[#FF4757]">[필수]</span> 개인정보 수집·이용에 동의합니다. (방송·정산 처리 목적)
                      </span>
                    </label>
                    {agreeError && <p className="text-[12px] text-[#FF4757]">{agreeError}</p>}
                    {formError && <p className="text-[13px] text-[#FF4757]" role="alert">{formError}</p>}

                    <Button
                      type="submit" variant="ink" size="md"
                      label={submitting ? '신청 중…' : '회원가입'}
                      disabled={submitting} className="w-full"
                    />
                  </div>
                </form>
              ) : step === 'choose' ? (
                <div className={card} style={cardBorder}>
                  <div className="space-y-3">
                    <button
                      type="button" onClick={handleKakao}
                      className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 focus:outline-none focus-visible:shadow-ring"
                      style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="rgba(0,0,0,0.85)" d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.66l-.95 3.52c-.08.31.27.56.54.38l4.19-2.79c.51.05 1.03.08 1.56.08 5.52 0 10-3.54 10-7.85C22 6.54 17.52 3 12 3z" />
                      </svg>
                      카카오로 시작하기
                    </button>

                    <button
                      type="button" onClick={handleNaver}
                      className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 text-paper focus:outline-none focus-visible:shadow-ring"
                      style={{ backgroundColor: '#03C75A' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#fff" d="M13.6 12.5 8.9 5.5H4.9v13h4.5v-7l4.7 7h4v-13h-4.5v7Z" />
                      </svg>
                      네이버로 시작하기
                    </button>

                    <button
                      type="button" onClick={() => { setFormError(null); setStep('phone-number') }}
                      className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 border border-rule text-ink focus:outline-none focus-visible:shadow-ring"
                    >
                      휴대폰 번호로 시작하기
                    </button>

                    {formError && <p className="text-center text-[13px] text-[#FF4757] pt-1">{formError}</p>}
                  </div>
                </div>
              ) : (
                <div className={card} style={cardBorder}>
                  <div className="space-y-3">
                    {step === 'phone-number' ? (
                      <>
                        <input
                          value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="휴대폰 번호 (01012345678)" inputMode="numeric"
                          className={field} autoFocus
                        />
                        <Button
                          type="button" variant="ink" size="md" className="w-full"
                          label={phoneSubmitting ? '전송 중…' : '인증번호 받기'}
                          disabled={phoneSubmitting} onClick={() => void handleSendCode()}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-[12.5px] text-ink-soft">{phoneInput}로 전송된 인증번호를 입력해 주세요.</p>
                        <input
                          value={code} onChange={(e) => setCode(e.target.value)}
                          placeholder="인증번호 6자리" inputMode="numeric"
                          className={field} autoFocus
                        />
                        <Button
                          type="button" variant="ink" size="md" className="w-full"
                          label={phoneSubmitting ? '확인 중…' : '확인'}
                          disabled={phoneSubmitting} onClick={() => void handleVerifyCode()}
                        />
                      </>
                    )}
                    {phoneError && <p className="text-[13px] text-[#FF4757]" role="alert">{phoneError}</p>}
                    <button
                      type="button"
                      onClick={() => { setStep('choose'); setPhoneError(null); setCode('') }}
                      className="w-full text-center text-[13px] text-ink-faint underline pt-1 focus:outline-none focus-visible:shadow-ring"
                    >
                      다른 방법으로 가입
                    </button>
                  </div>
                </div>
              )}

              {!session && (
                <p className="text-center text-[13px] text-text-sub mt-4">
                  이미 계정이 있으신가요?{' '}
                  <Link to="/host/login" className="text-ink hover:underline">로그인</Link>
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
