import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// 뒤로 가기 시 이전 스크롤 위치를 복원한다 — 기본은 BrowserRouter라 브라우저 자체
// scrollRestoration에 맡기면 데이터 로딩이 끝나기 전에 복원을 시도해 실패하는 경우가 많아
// (매장 직원 피드백 2026-08-10: "상품 목록 스크롤해서 내려간 뒤 상세 보고 뒤로가면 맨 위로 감")
// 직접 sessionStorage에 저장해두고, 렌더가 끝난 뒤 복원한다.
//
// 주의: 스크롤 값은 "페이지를 떠나는 시점(effect cleanup)"에 읽으면 이미 늦다 — 그 시점엔
// 다음 페이지가 이미 마운트되어 DOM/스크롤 높이가 바뀐 뒤라 엉뚱한 값(대개 0)을 읶게 된다.
// 그래서 각 페이지에 머무는 동안 scroll 이벤트로 "실시간으로" 계속 저장해둔다.
const KEY = 'bg_scroll_positions'

function readMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeMap(map: Record<string, number>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* 무시 */
  }
}

export default function ScrollRestoration() {
  const location = useLocation()
  const navType = useNavigationType()
  const tickingRef = useRef(false)

  useEffect(() => {
    if (window.history.scrollRestoration) window.history.scrollRestoration = 'manual'
  }, [])

  // 이 페이지에 머무는 동안 스크롤할 때마다 현재 위치를 실시간으로 저장.
  useEffect(() => {
    const key = location.key
    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        const map = readMap()
        map[key] = window.scrollY
        writeMap(map)
        tickingRef.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.key])

  // 새 페이지 렌더 뒤 뒤로가기/앞으로가기면 저장된 위치로, 아니면 맨 위로.
  // 목록이 데이터를 비동기로 불러오는 페이지가 많아, 마운트 직후엔 아직 스크롤할 높이가
  // 안 나온 상태일 수 있다 — 목표 높이가 나올 때까지(또는 최대 1.5초) 매 프레임 재시도.
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }
    const map = readMap()
    const target = map[location.key]
    if (typeof target !== 'number') {
      window.scrollTo(0, 0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tryRestore = () => {
      window.scrollTo(0, target)
      const reached = document.documentElement.scrollHeight - window.innerHeight >= target - 2
      if (!reached && performance.now() - start < 1500) {
        raf = requestAnimationFrame(tryRestore)
      }
    }
    raf = requestAnimationFrame(tryRestore)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, navType])

  return null
}
