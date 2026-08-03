import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

// PC 버전 인증 페이지 공통 틀 — 로그인/회원가입/이메일가입 3곳이 공유.
// 전체 사이트 헤더 대신 로고 하나만 두고 카드를 화면 중앙에 넓게 배치한다(작업 목적이 뚜렷한
// 단일 태스크 화면이라 내비게이션으로 시선을 분산시키지 않는다).
export default function DesktopAuthLayout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-quiet flex flex-col items-center justify-center px-6 py-16">
      <Link to="/app/home" className="text-[22px] font-bold text-ink tracking-[-0.01em] mb-8">
        뷰티그라운드
      </Link>
      <div className="w-full max-w-[440px] bg-paper border border-rule px-10 py-10">
        {title && <h1 className="text-[20px] font-bold text-ink text-center mb-8">{title}</h1>}
        {children}
      </div>
    </div>
  )
}
