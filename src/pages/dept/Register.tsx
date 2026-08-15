import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEPT_NAMES } from '../../lib/deptAccount'
import type { DeptAccount } from '../../lib/types'

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const field: React.CSSProperties = {
  width: '100%', padding: '13px 14px', border: '1px solid #d5d8e2', borderRadius: 10, fontSize: 15, color: '#1a1e36',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 6,
}

// 백화점 담당자 셀프 가입 — 지점 전용 링크(/dept/register/:id)로만 가입 가능. 어느 백화점·지점인지는
// 링크 자체가 이미 정해서 담당자는 이메일·비밀번호만 입력한다(2026-08-15, 대표님 지시:
// 브랜드/지점명을 담당자가 직접 고를 여지 없이 링크=신원 보증 방식으로).
export default function DeptRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [slot, setSlot] = useState<DeptAccount | null>(null)
  const [loadingSlot, setLoadingSlot] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoadingSlot(false); return }
    let active = true
    supabase.from('dept_accounts').select('*').eq('id', id).is('user_id', null).maybeSingle().then(({ data }) => {
      if (!active) return
      setSlot((data as DeptAccount | null) ?? null)
      setLoadingSlot(false)
    })
    return () => { active = false }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !id) return
    setError(null)

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) { setError('올바른 이메일 형식을 입력해 주세요.'); return }
    if (!PASSWORD_RE.test(password)) { setError('비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.'); return }

    setSubmitting(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setSubmitting(false)
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        setError('이미 가입된 이메일입니다. 로그인해 주세요.')
      } else {
        setError(`가입 실패: ${signUpError.message}`)
      }
      return
    }
    if (!signUpData.user || signUpData.user.identities?.length === 0) {
      setSubmitting(false)
      setError('이미 가입된 이메일입니다. 로그인해 주세요.')
      return
    }

    const { error: claimError } = await supabase.rpc('claim_dept_account_by_id', { p_id: id })
    setSubmitting(false)
    if (claimError) {
      setError(`가입 처리 실패: ${claimError.message}`)
      return
    }

    navigate('/dept/sales')
  }

  const card = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(20,25,60,.1)', padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src="/images/bg-logo-gold-wordmark.png" alt="뷰티그라운드" style={{ width: 140, margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#8b90ad', letterSpacing: '.5px' }}>백화점 담당자 가입</h1>
        </div>
        {children}
      </div>
    </div>
  )

  if (loadingSlot) {
    return card(<p style={{ textAlign: 'center', color: '#8b90ad', fontSize: 14 }}>확인 중…</p>)
  }

  if (!id || !slot) {
    return card(
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#c0392b', marginBottom: 10 }}>
          유효하지 않거나 이미 사용된 가입링크입니다.
        </p>
        <p style={{ fontSize: 12.5, color: '#8b90ad' }}>뷰티그라운드 담당자에게 새 링크를 요청해 주세요.</p>
      </div>
    )
  }

  return card(
    <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#f4f5f9', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#8b90ad', marginBottom: 2 }}>가입 대상</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1e36' }}>{slot.display_name}</p>
        <p style={{ fontSize: 11.5, color: '#8b90ad' }}>{DEPT_NAMES[slot.dept_key]}</p>
      </div>

      <div>
        <label htmlFor="email" style={label}>아이디(이메일)</label>
        <input
          id="email" type="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="example@company.com"
          style={field}
        />
      </div>
      <div>
        <label htmlFor="password" style={label}>비밀번호</label>
        <input
          id="password" type="password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상, 영문+숫자+특수문자"
          style={field}
        />
      </div>

      {error && (
        <p role="alert" style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%', padding: 16, borderRadius: 12, fontSize: 15.5, fontWeight: 700,
          cursor: submitting ? 'default' : 'pointer', border: 'none',
          background: submitting ? '#999' : '#1a1e36', color: '#fff', marginTop: 4,
        }}
      >
        {submitting ? '가입 중...' : '가입하고 시작하기'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#8b90ad', margin: '4px 0 0' }}>
        이미 계정이 있으신가요?{' '}
        <Link to="/dept/login" style={{ color: '#1a1e36', fontWeight: 700 }}>로그인</Link>
      </p>
    </form>
  )
}
