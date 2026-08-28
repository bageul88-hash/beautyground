import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, MADE_IN } from '../../constants'

interface ProductInfoTableProps {
  consumerPrice: number // 소비자가(정가)
  salePrice: number // 판매가
  brand?: string
  partnerId?: string | null // 있으면 브랜드명을 /app/brand/:id 링크로 렌더
  madeIn?: string
  showPrice?: boolean // 소비자가·판매가 행 표시 여부(가격이 위에 따로 있으면 false)
  rewardRate?: number // 내 등급 적립률(%) — 지정하면 "적립" 행 노출(2026-08-23 실적립 활성화)
  className?: string
}

// petitfee 스타일 상품 정보 테이블 (소비자가·판매가·브랜드·제조국·배송비)
// 고객 상세 / 파트너 상품관리 상세 공용. 배송·적립 정책은 constants 에서 전역 관리.
export default function ProductInfoTable({
  consumerPrice,
  salePrice,
  brand,
  partnerId,
  madeIn = MADE_IN,
  showPrice = true,
  rewardRate,
  className = '',
}: ProductInfoTableProps) {
  const brandValue = partnerId ? (
    <Link to={`/app/brand/${partnerId}`} className="font-semibold text-ink underline underline-offset-2">
      {brand}
    </Link>
  ) : (
    brand
  )
  const hasDiscount = salePrice < consumerPrice
  const priceRows: Array<[string, ReactNode]> = showPrice
    ? [
        [
          '소비자가',
          <span className={hasDiscount ? 'line-through text-ink-faint' : 'text-ink'}>
            {consumerPrice.toLocaleString('ko-KR')}원
          </span>,
        ],
        ['판매가', <span className="font-bold tabular-nums text-ink">{salePrice.toLocaleString('ko-KR')}원</span>],
      ]
    : []
  const rows: Array<[string, ReactNode]> = [
    ...priceRows,
    ...(rewardRate
      ? [[
          '적립',
          <span>
            <span className="font-bold text-accent-deep">{Math.round((salePrice * rewardRate) / 100).toLocaleString('ko-KR')}원</span>
            <span className="text-ink-faint"> ({rewardRate}% 적립)</span>
          </span>,
        ] as [string, ReactNode]]
      : []),
    ...(brand ? [['브랜드', brandValue] as [string, ReactNode]] : []),
    ['제조국', madeIn],
    [
      '배송비',
      `${SHIPPING_FEE.toLocaleString('ko-KR')}원 (${FREE_SHIPPING_THRESHOLD.toLocaleString('ko-KR')}원 이상 구매 시 무료)`,
    ],
  ]
  return (
    <dl className={`text-[13px] ${className}`}>
      {rows.map(([label, value], i) => (
        <div key={i} className="flex items-start py-2.5 border-b border-rule last:border-b-0">
          <dt className="w-[84px] shrink-0 text-ink-faint">{label}</dt>
          <dd className="flex-1 text-ink leading-relaxed">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
