import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HeroBanner } from '../../hooks/useHeroBanners'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import ImagePlaceholder from '../common/ImagePlaceholder'

// 홈 히어로 배너: 관리자가 고른 상품을 그린 그라데이션 카드로 노출.
// 2026-08-08 대표님 확정 레퍼런스(쇼핑몰예시.jpg) 픽셀 실측 적용 — 카드 배경 그라데이션
// #6DB33F→#94D64F, 이미지는 카드 우하단에 걸치고, 좌하단 흰 알약이 CTA를 대신한다.
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
      className="relative select-none px-4 pt-4 pb-1"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="추천 배너"
    >
      <div className="overflow-hidden rounded-card">
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
              // 큐레이션 문구: 할인 중이면 퍼센트, 최근 45일 내 등록이면 NEW, 그 외 BUY NOW만
              const isNew =
                product.created_at != null &&
                Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 45
              const ctaLabel = hasSale ? `${rate}% OFF | BUY NOW` : isNew ? 'NEW | BUY NOW' : 'BUY NOW'
              return (
                <button
                  key={banner.id}
                  onClick={() => navigate(`/app/product/${product.id}`)}
                  tabIndex={hidden ? -1 : 0}
                  aria-hidden={hidden}
                  className="relative min-h-[220px] w-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-hero-1 to-hero-2 p-5 text-left focus:outline-none focus-visible:shadow-ring"
                  aria-label={product.name}
                >
                  <div className="relative z-10 max-w-[62%]">
                    {product.brand ? (
                      <span className="text-[12px] font-bold text-paper/90">{product.brand}</span>
                    ) : null}
                    <h2 className="mt-1.5 text-[20px] font-bold leading-tight tracking-[-0.02em] text-paper line-clamp-2">
                      {custom?.headline || product.name}
                    </h2>
                    {custom?.subcopy && <p className="mt-2 text-[12px] leading-relaxed text-paper/90 line-clamp-2">{custom.subcopy}</p>}
                    <span className="mt-4 inline-block rounded-pill bg-paper/95 px-3.5 py-2 text-[11px] font-bold text-accent-ink">
                      {ctaLabel}
                    </span>
                  </div>
                  {/* 상품 이미지 — 카드 우하단에 걸쳐서, 브랜드 원본 비율 유지 */}
                  <div className="pointer-events-none absolute bottom-0 right-0 h-[85%] w-[44%]">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt=""
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.25)]"
                      />
                    ) : (
                      <ImagePlaceholder className="h-full w-full" />
                    )}
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
                    <div className="bg-paper px-4 py-4">
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
            className="absolute left-6 top-[calc(50%-0.75rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill bg-paper/90 text-ink shadow-card focus:outline-none focus-visible:shadow-ring"
          >
            <span aria-hidden="true" className="text-base font-bold leading-none">
              ‹
            </span>
          </button>
          <button
            onClick={() => goTo(current + 1)}
            aria-label="다음 배너"
            className="absolute right-6 top-[calc(50%-0.75rem)] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill bg-paper/90 text-ink shadow-card focus:outline-none focus-visible:shadow-ring"
          >
            <span aria-hidden="true" className="text-base font-bold leading-none">
              ›
            </span>
          </button>
          {/* 진행 표시 */}
          <div className="flex justify-center gap-1.5 py-3">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => goTo(i)}
                aria-label={`${i + 1}번째 배너로 이동`}
                aria-current={current === i ? 'true' : undefined}
                className={`h-[6px] rounded-pill transition-all duration-300 focus:outline-none focus-visible:shadow-ring ${
                  current === i ? 'w-6 bg-accent' : 'w-[6px] bg-rule'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
