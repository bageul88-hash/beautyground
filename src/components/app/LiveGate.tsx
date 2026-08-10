import { useState } from 'react'
import type { ReactNode } from 'react'
import { useIsAdmin } from '../../lib/useIsAdmin'

const UNLOCK_KEY = 'bg_preview_unlock'
const PREVIEW_CODE = '0990'

// 라이브 라우트 접근 통제 — 관리자는 그대로 통과, 그 외엔 미리보기 코드 입력으로 임시 열람 가능
// (2026-08-06, 대표님이 검수 편의를 위해 요청). 일반 방문자는 URL을 알아도 코드를 모르면 못 들어오고,
// "라이브"라는 단어는 프롬프트에 노출하지 않아 이 페이지의 정체를 최대한 숨긴다.
// 온라인몰에 라이브커머스를 아예 노출하지 않기로 한 방침(2026-07-31) 자체는 유지.
//
// ⚠️ 2026-08-10: 세션 저장(sessionStorage)이었을 때는 "홈 화면에 추가"한 앱을 새로 열 때마다
// 코드 입력 화면부터 다시 나왔음(대표님 지적: "라이브커머스 메인 페이지가 보여야지") — 앱을
// 완전히 닫고 다시 열면 매번 새 세션으로 취급돼 코드가 초기화됐기 때문. localStorage로 바꿔서
// 한 번 입력하면 그 기기/브라우저에서는 계속 유지되게 함(관리자 로그인 유지 방식과 동일).
//
// ⚠️ 2026-08-10 추가: "홈 화면에 추가" 시 라이브 전용 이름/아이콘이 적용되도록 이 컴포넌트에서
// JS로 <link rel=manifest>를 바꿔봤으나, iOS Safari가 "홈 화면에 추가" 하는 순간 이 JS 변경을
// 무시하고 원래(온라인몰용) manifest를 그대로 가져가버림(대표님 실기기 확인 — 앱이 온라인몰로
// 열림). 그 방식은 폐기하고, 대신 완전히 정적인 public/live.html(+manifest-live.json)을
// 새로 만들어 그 페이지 자체를 "홈 화면에 추가"하도록 함 — 여기서는 더 손댈 것 없음.
export default function LiveGate({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useIsAdmin()
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === PREVIEW_CODE)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-text-hint text-[14px]">
        불러오는 중...
      </div>
    )
  }

  if (isAdmin || unlocked) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code === PREVIEW_CODE) {
      localStorage.setItem(UNLOCK_KEY, code)
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-[320px] text-center">
        <p className="text-[14px] text-text-hint mb-4">접근 코드를 입력하세요</p>
        <input
          type="password"
          inputMode="numeric"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false) }}
          autoFocus
          className="w-full border border-cream-2 rounded-md px-4 py-3 text-center text-[16px] tracking-[0.2em] focus:outline-none focus:shadow-focus"
        />
        {error && <p className="mt-2 text-[12.5px] text-red-500">코드가 올바르지 않습니다</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-pill bg-gold text-white text-[14px] font-medium py-3 hover:bg-gold-light transition-colors"
        >
          확인
        </button>
      </form>
    </div>
  )
}
