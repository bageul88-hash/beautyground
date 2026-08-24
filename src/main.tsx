import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

// 우클릭(컨텍스트 메뉴) 사이트 전체 차단 — 이미지 주소 복사·저장을 일반 고객이 쉽게 못 하도록.
// 참고: 개발자도구 등으로는 우회 가능한 약한 방어라, 완전한 이미지 보호 수단은 아님.
document.addEventListener('contextmenu', (e) => e.preventDefault())

// 웹 푸시 알림용 서비스 워커 등록(팔로우한 브랜드 라이브 시작 알림). 미지원 브라우저(iOS 사파리 탭 등)는 조용히 무시.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
