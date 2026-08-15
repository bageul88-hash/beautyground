import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const field: React.CSSProperties = {
  width: '100%', padding: '13px 14px', border: '1px solid #d5d8e2', borderRadius: 10, fontSize: 15, color: '#1a1e36',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 6,
}

// 백화점 담당자 셀프 가입 — 관리자가 발급한 가입코드로 본인이 직접 아이디/비밀번호를 만든다
// (2026-08-15, 대표님 지시: "실제 브랜드/지점이 본인 아이디·비번만 설정하고 바로 볼 수 있게").
export default function DeptRegister() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!EMAIL_RE.test(email)) { setError('올바른 이메일 형식을 입력해 주세요.'); return }
    if (!PASSWORD_RE.test(password)) { setError('비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다.'); return }
    if (!code.trim()) { setError('가입코드를 입력해 주세요.'); return }

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
    if (signUpData.user?.identities?.length === 0) {
      setSubmitting(false)
      setError('이미 가입된 이메일입니다. 로그인해 주세요.')
      return
    }

    // 이메일 인증 없이 바로 세션이 생기는 프로젝트 설정 기준 — 코드 소진 처리.
    const { error: claimError } = await supabase.rpc('claim_dept_account', { p_code: code.trim().toUpperCase() })
    setSubmitting(false)
    if (claimError) {
      setError(`가입코드 확인 실패: ${claimError.message} — 코드를 다시 확인해 주세요.`)
      return
    }

    navigate('/dept/sales')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(20,25,60,.1)', padding: 28 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src="/images/bg-logo-gold-wordmark.png" alt="뷰티그라운드" style={{ width: 140, margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#8b90ad', letterSpacing: '.5px' }}>백화점 담당자 가입</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 14 }}>
          <div>
            <label htmlFor="code" style={label}>가입코드</label>
            <input
              id="code" type="text" required
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="뷰티그라운드에서 받은 6자리 코드"
              style={{ ...field, letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center' }}
            />
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
      </div>
    </div>
  )
}
