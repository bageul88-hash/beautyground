import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HeroBanner } from '../../hooks/useHeroBanners'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import ImagePlaceholder from '../common/ImagePlaceholder'

// 홈 히어로 배너: 관리자가 고른 상품을 이미지 + 하단 정보바로 노출.
// 「생방송 슬레이트」 월드 — 방송 자막(lower third)의 구조를 그대로 쓴다:
// 이미지 위에 글자를 얹지 않고, 이미지 아래 흰 면에 정보를 얹는다.
// (그래서 그라데이션 스크림이 필요 없다 — 이 월드는 그라데이션을 쓰지 않는다.)
export default function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef(0)

  const count = banners.length

  // 모션 최소화를 선택한 사용자에게는 자동 넘김도 슬라이드 애니메이션도 걸지 않는다.
  // (자동으로 움직이는 캐러셀은 이 설정이 가장 먼저 막으려는 종류의 움직임이다.)
  const reduceMotion = useReducedMotion()

  const resetInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (count <= 1 || reduceMotion) return
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count)
    }, 4000)
  }, [count, reduceMotion])

  useEffect(() => {
    resetInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [resetInterval])

  const goTo = (index: number) => {
    setCurrent((index + count) % count)
    resetInterval()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0)
    if (Math.abs(delta) > 30) goTo(delta > 0 ? current + 1 : current - 1)
  }

  if (count === 0) {
    return (
      <section className="border-b border-rule bg-paper px-4 py-12">
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">
          백화점에서 직접 고른 뷰티,
          <br />
          방송으로 만나보세요
        </h2>
        <p className="mt-3 text-[14px] text-ink-soft">
          AK플라자 광명점·수원역점에서 운영 중인 편집샵입니다.
        </p>
      </section>
    )
  }

  return (
    <section
      className="relative select-none border-b border-rule bg-paper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="추천 배너"
    >
      <div className="overflow-hidden">
        <div
          className={`flex ${reduceMotion ? '' : 'transition-transform duration-500 ease-out'}`}
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner, i) => {
            const product = banner.product
            const custom = banner.custom
            const hidden = i !== current

            if (product) {
              const hasSale = product.sale_price != null && product.sale_price < product.price
              const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
              // 히어로는 가격 대신 큐레이션 성격을 보여준다(2026-08-08 대표님 지시):
              // 할인 중 → 특가세일, 최근 45일 내 등록 → 신상품, 그 외 → 추천상품
              const isNew =
                product.created_at != null &&
                Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 45
              const tag = hasSale
                ? { label: `특가세일 -${rate}%`, className: 'bg-signal-red text-paper' }
                : isNew
                  ? { label: '신상품', className: 'bg-signal-blue text-paper' }
                  : { label: '추천상품', className: 'bg-ink text-paper' }
              return (
                <button
                  key={banner.id}
                  onClick={() => navigate(`/app/product/${product.id}`)}
                  tabIndex={hidden ? -1 : 0}
                  aria-hidden={hidden}
                  className="w-full flex-shrink-0 text-left focus:outline-none focus-visible:shadow-ring"
                  aria-label={product.name}
                >
                  {/* object-contain: 브랜드 원본 비율이 배너 틀과 달라도 사은품 태그·프로모션 배지가 잘리지 않음 */}
                  <div className="aspect-square bg-quiet">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  {/* 자막바: 이미지 아래 흰 면. 가격 숫자 대신 큐레이션 배지 + 상품명 */}
                  <div className="border-t border-rule px-4 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${tag.className}`}
                    >
                      {tag.label}
                    </span>
                    {/* 관리자가 headline을 넣어두면 마케팅 카피를 함께 보여준다(2026-08-06) */}
                    {custom?.headline && (
                      <p className="mt-2 text-[13px] font-bold text-ink-soft">{custom.headline}</p>
                    )}
                    <h2 className="mt-1.5 text-[17px] font-bold leading-snug tracking-[-0.02em] text-ink line-clamp-2">
                      {product.name}
                    </h2>
                    {custom?.subcopy && <p className="mt-1.5 text-[13px] text-ink-faint">{custom.subcopy}</p>}
                  </div>
                </button>
              )
            }

            if (custom) {
              const handleClick = () => {
                const link = custom.link_url
                if (!link) return
                if (link.startsWith('/')) navigate(link)
                else window.location.href = link
              }
              return (
                <button
                  key={banner.id}
                  onClick={handleClick}
                  disabled={!custom.link_url}
                  tabIndex={hidden ? -1 : 0}
                  aria-hidden={hidden}
                  className="w-full flex-shrink-0 text-left disabled:cursor-default focus:outline-none focus-visible:shadow-ring"
                  aria-label={custom.headline ?? '배너'}
                >
                  <div className="aspect-square bg-quiet">
                    {custom.image_url ? (
                      <img
                        src={custom.image_url}
                        alt={custom.headline ?? ''}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  {(custom.headline || custom.subcopy) && (
                    <div className="border-t border-rule px-4 py-4">
                      {custom.headline && (
                        <h2 className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-ink line-clamp-2">
                          {custom.headline}
                        </h2>
                      )}
                      {custom.subcopy && <p className="mt-1.5 text-[14px] text-ink-soft">{custom.subcopy}</p>}
                    </div>
                  )}
                </button>
              )
            }

            return <div key={banner.id} className="aspect-square w-full flex-shrink-0 bg-quiet" />
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            aria-label="이전 배너"
            className="absolute left-3 top-[calc(50%-2.5rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control border border-rule bg-paper text-ink focus:outline-none focus-visible:shadow-ring"
          >
            <span aria-hidden="true" className="text-base font-bold leading-none">
              ‹
            </span>
          </button>
          <button
            onClick={() => goTo(current + 1)}
            aria-label="다음 배너"
            className="absolute right-3 top-[calc(50%-2.5rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control border border-rule bg-paper text-ink focus:outline-none focus-visible:shadow-ring"
          >
            <span aria-hidden="true" className="text-base font-bold leading-none">
              ›
            </span>
          </button>
          {/* 진행 표시 — 원형 점 대신 방송 눈금처럼 납작한 막대 */}
          <div className="flex justify-center gap-1.5 px-4 pb-4">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 배너로 이동`}
                aria-current={current === i ? 'true' : undefined}
                className={`h-[3px] transition-all duration-300 focus:outline-none focus-visible:shadow-ring ${
                  current === i ? 'w-7 bg-ink' : 'w-3 bg-rule'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
