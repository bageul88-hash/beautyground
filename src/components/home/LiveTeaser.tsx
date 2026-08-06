import { Link } from 'react-router-dom'
import { useShopLives } from '../../hooks/useShopLives'
import ImagePlaceholder from '../common/ImagePlaceholder'

// 홈용 라이브 티저 — 진행중/예정 라이브가 있으면 그걸, 없으면 다시보기 몇 개를 보여준다.
// ⚠️ 만들어만 두고 아직 어디에도 import/렌더하지 않음(대표님 지시, 2026-08-06) —
// 라이브커머스를 온라인몰에 노출 안 하기로 한 기존 방침(LiveGate.tsx 주석, 2026-07-31)과
// 같은 맥락. 실제로 홈에 붙일 땐 AppHome.tsx/DesktopHome.tsx에 <LiveTeaser />만 추가하면 됨.
export default function LiveTeaser() {
  const { lives, loading } = useShopLives()
  if (loading || lives.length === 0) return null

  const liveNow = lives.find((l) => l.status === 'live')
  const items = liveNow ? [liveNow] : lives.slice(0, 3)

  return (
    <section className="pt-10 px-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          {liveNow ? '지금 라이브 중' : '라이브 예정'}
        </h2>
        <Link to="/app/live" className="shrink-0 text-[13px] text-ink-soft focus:outline-none focus-visible:shadow-ring">
          전체보기 ›
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {items.map((l) => (
          <Link
            key={l.id}
            to={`/app/live/${l.id}`}
            className="w-[42%] flex-shrink-0 text-left focus:outline-none focus-visible:shadow-ring"
          >
            <div className="relative aspect-square overflow-hidden bg-quiet">
              {l.thumbnail_url ? (
                <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlaceholder />
              )}
              {l.status === 'live' && (
                <span className="absolute top-2 left-2 bg-signal-red text-paper text-[11px] font-bold px-1.5 py-0.5">
                  LIVE
                </span>
              )}
            </div>
            <p className="mt-2 text-[13px] text-ink line-clamp-2 leading-snug">{l.title}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
