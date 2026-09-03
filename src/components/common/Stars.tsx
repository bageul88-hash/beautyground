// 리뷰 별점 표시/선택 — src/pages/AppMyReviews.tsx, src/components/reviews/DesktopMyReviews.tsx 공용
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 text-signal-yellow" aria-label={`평점 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: size, opacity: n <= rating ? 1 : 0.25 }} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

export function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n}점`}
          className="text-signal-yellow focus:outline-none focus-visible:shadow-ring"
        >
          <span style={{ fontSize: 22, opacity: n <= value ? 1 : 0.25 }} aria-hidden="true">★</span>
        </button>
      ))}
    </span>
  )
}
