import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

// 우클릭(컨텍스트 메뉴) 사이트 전체 차단 — 이미지 주소 복사·저장을 일반 고객이 쉽게 못 하도록.
// 참고: 개발자도구 등으로는 우회 가능한 약한 방어라, 완전한 이미지 보호 수단은 아님.
document.addEventListener('contextmenu', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
