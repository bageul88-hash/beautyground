import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// 뒤로 가기 시 이전 스크롤 위치를 복원한다 — 기본은 BrowserRouter라 브라우저 자체
// scrollRestoration에 맡기면 데이터 로딩이 끝나기 전에 복원을 시도해 실패하는 경우가 많아
// (매장 직원 피드백 2026-08-10: "상품 목록 스크롤해서 내려간 뒤 상세 보고 뒤로가면 맨 위로 감")
// 직접 sessionStorage에 저장해두고, 렌더가 끝난 뒤 복원한다.
//
// 주의: 스크롤 값은 "페이지를 떠나는 시점(effect cleanup)"에 읽으면 이미 늦다 — 그 시점엔
// 다음 페이지가 이미 마운트되어 DOM/스크롤 높이가 바뀐 뒤라 엉뚱한 값(대개 0)을 읽게 된다.
// 그래서 각 페이지에 머무는 동안 scroll 이벤트로 "실시간으로" 계속 저장해둔다.
//
// 2026-08-12 보강(대표님 지적: "제품 클릭 후 뒤로가면 그 제품 위치로 안 간다"):
// ① 픽셀 위치보다 정확한 "상품 앵커" 방식 추가 — [data-product-id] 요소를 클릭하면 그 상품 id를
//    현재 페이지 키에 저장해두고, 뒤로 왔을 때 그 상품 카드를 찾아 화면 중앙으로 스크롤한다.
//    (목록이 비동기 로딩이라 요소가 나타날 때까지 재시도)
// ② 재시도 시한 1.5초 → 5초로 연장 — 상품 목록 쿼리가 느린 날엔 1.5초 안에 높이가 안 나와
//    복원을 포기하던 문제 해결.
const KEY = 'bg_scroll_positions'
const ANCHOR_KEY = 'bg_scroll_anchors'
const RESTORE_DEADLINE_MS = 5000

function readMap(storageKey: string): Record<string, string | number> {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) ?? '{}')
  } catch {
    return {}
  }
}

function writeMap(storageKey: string, map: Record<string, string | number>) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(map))
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
        const map = readMap(KEY)
        map[key] = window.scrollY
        writeMap(KEY, map)
        tickingRef.current = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.key])

  // 상품 카드([data-product-id]) 클릭을 캡처 단계에서 감지해 "이 페이지에서 마지막으로 누른 상품"을
  // 저장한다 — 각 목록 페이지를 일일이 고치지 않아도 카드 컴포넌트만 attr을 달면 전부 적용된다.
  useEffect(() => {
    const key = location.key
    const onClickCapture = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-product-id]')
      const id = el?.getAttribute('data-product-id')
      if (!id) return
      const map = readMap(ANCHOR_KEY)
      map[key] = id
      writeMap(ANCHOR_KEY, map)
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [location.key])

  // 새 페이지 렌더 뒤 뒤로가기/앞으로가기면 저장된 위치로, 아니면 맨 위로.
  // 목록이 데이터를 비동기로 불러오는 페이지가 많아, 마운트 직후엔 아직 내용이
  // 안 나온 상태일 수 있다 — 목표(앵커 요소 또는 높이)가 나올 때까지 매 프레임 재시도.
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0)
      return
    }
    const anchorId = readMap(ANCHOR_KEY)[location.key]
    const target = readMap(KEY)[location.key]
    if (typeof anchorId !== 'string' && typeof target !== 'number') {
      window.scrollTo(0, 0)
      return
    }
    let raf = 0
    const start = performance.now()
    const tryRestore = () => {
      // 1순위: 클릭했던 상품 카드가 렌더됐으면 그 카드를 화면 중앙으로 — 픽셀 오차 없이 정확.
      if (typeof anchorId === 'string') {
        const el = document.querySelector(`[data-product-id="${CSS.escape(anchorId)}"]`)
        if (el) {
          el.scrollIntoView({ block: 'center' })
          return
        }
      }
      // 2순위: 저장된 픽셀 위치 (앵커 요소가 아직/영영 없을 때의 폴백)
      if (typeof target === 'number') {
        window.scrollTo(0, target)
        const reached = document.documentElement.scrollHeight - window.innerHeight >= target - 2
        if (reached && typeof anchorId !== 'string') return
      }
      if (performance.now() - start < RESTORE_DEADLINE_MS) {
        raf = requestAnimationFrame(tryRestore)
      }
    }
    raf = requestAnimationFrame(tryRestore)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, navType])

  return null
}
