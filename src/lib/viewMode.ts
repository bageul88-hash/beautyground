export type ViewMode = 'mobile' | 'desktop'

// ── 2026-08-12 대표님 확정: 소비자 화면은 모바일 버전으로 전면 통일 ──
// PC/모바일 이중 유지가 반복 사고의 원인(모바일만 고쳐지고 PC 미반영, 세션 간 충돌,
// PC placeholder 방치 등)이라 소비자 화면은 항상 모바일 레이아웃 하나만 서빙한다.
// PC 브라우저에서는 AppFrame이 화면 중앙 480px 프레임으로 보여준다(med-ligne 패턴).
// Desktop* 컴포넌트들은 삭제하지 않고 남겨둠 — 되돌릴 일이 생기면 이 파일만 revert.
// (관리자/파트너 화면은 이 훅을 쓰지 않으므로 영향 없음)
export function useViewMode() {
  return {
    mode: 'mobile' as ViewMode,
    isDesktop: false,
    toggle: () => {},
  }
}
