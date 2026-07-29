// 상품·카테고리 썸네일이 아직 없을 때의 대체 화면.
// 전에는 골드+남색 브랜드 로고(bg-logo-mark.png)를 대체 이미지로 썼는데, 그러면 사진이
// 없는 자리마다 골드가 새어나와 "골드 배제" 규칙이 코드 곳곳에서 조용히 깨지고 있었다.
// 대체 이미지는 브랜드를 주장하지 않는 중립 자리표시자여야 한다 — quiet 바탕 + ink-faint 아이콘.
export default function ImagePlaceholder({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-quiet ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="w-1/4 h-1/4 text-ink-faint" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="15" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="m4.5 16.5 5-4.5 3.5 3 3-2.5 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
