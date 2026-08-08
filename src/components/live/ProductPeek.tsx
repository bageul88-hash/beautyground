export interface PrimaryProduct {
  name: string
  price: number
  sale_price: number | null
  thumbnail_url: string | null
}

const won = (n: number) => n.toLocaleString('ko-KR')

// 목록 카드에 얹는 대표 상품 미리보기 — 클릭 전에도 "뭘 얼마에 파는지" 보이게(2026-08-06,
// 구매자가 상품을 모른 채 클릭해야 하는 문제 대응). 배경색 있는 큰 히어로 위와 흰 카드 위
// 둘 다에서 읽혀야 해서, 어두운 배경(히어로)엔 알약형 흰 칩, 밝은 배경(카드)엔 인라인 텍스트로.
export default function ProductPeek({ product, variant }: { product: PrimaryProduct; variant: 'onImage' | 'inline' }) {
  const sell = product.sale_price ?? product.price
  const hasDiscount = product.sale_price != null && product.sale_price < product.price
  if (variant === 'onImage') {
    return (
      <div className="inline-flex items-center gap-2 bg-paper px-3 py-1.5 max-w-full">
        {product.thumbnail_url && (
          <img src={product.thumbnail_url} alt="" className="w-6 h-6 object-cover shrink-0" />
        )}
        <span className="text-[12px] text-ink-soft truncate">{product.name}</span>
        <span className="text-[13px] font-bold tabular-nums text-ink shrink-0">
          {hasDiscount && <span className="text-signal-red mr-1">할인</span>}
          {won(sell)}원
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      {product.thumbnail_url && (
        <img src={product.thumbnail_url} alt="" className="w-8 h-8 object-cover shrink-0 border border-rule" />
      )}
      <div className="min-w-0">
        <p className="text-[11.5px] text-ink-soft truncate">{product.name}</p>
        <p className="text-[13px] font-bold tabular-nums text-ink">
          {hasDiscount && <span className="text-signal-red mr-1">할인</span>}
          {won(sell)}원
        </p>
      </div>
    </div>
  )
}
