import type { ViewMode } from '../../lib/viewMode'

interface Props {
  mode: ViewMode
  onToggle: () => void
}

// 2026-08-12 대표님 확정: 소비자 화면 모바일 전면 통일로 PC/모바일 전환 버튼 자체를 숨김.
// 각 페이지의 <ViewModeToggle …/> 호출부는 그대로 두고 여기서만 null을 반환 —
// 되돌릴 때 이 파일과 lib/viewMode.ts만 revert하면 됨.
export default function ViewModeToggle(_props: Props) {
  return null
}
