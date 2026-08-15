import { Link } from 'react-router-dom'
import { useShopLives } from '../../hooks/useShopLives'
import ImagePlaceholder from '../common/ImagePlaceholder'
import type { Live } from '../../lib/types'

const STORES: { key: 'hyundai' | 'ak'; name: string; logo: string }[] = [
  { key: 'hyundai', name: '현대백화점', logo: '/images/memberships/hyundai.png' },
  { key: 'ak', name: 'AK플라자', logo: '/images/memberships/ak.png' },
]

// 우선순위: 진행중 라이브 > 가장 이른 예정 라이브 > 없음(방송 준비중으로 표시)
function pickForDept(lives: Live[], dept: 'hyundai' | 'ak') {
  const deptLives = lives.filter((l) => l.dept_key === dept)
  return deptLives.find((l) => l.status === 'live') ?? deptLives[0] ?? null
}

// 홈 "할인 특가" 바로 위 — 백화점별 라이브 진입 카드. LiveTeaser와 달리 방송이 없어도
// 항상 렌더링(백화점관 상시 진입점 역할), 모바일/데스크톱 양쪽에서 그대로 재사용(TrustStrip 패턴).
// 라이브커머스 메인은 /live(LiveMain, 2026-08-12 재구축, 공개) — 옛 /app/live 아님.
export default function DeptStoreLiveSection() {
  const { lives } = useShopLives()

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-2 md:pb-0">
      <h2 className="mb-3 md:mb-6 text-[17px] md:text-[13px] font-bold tracking-[-0.02em] md:tracking-[0.08em] text-ink md:text-ink-faint">
        백화점 라이브
      </h2>
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {STORES.map((store) => {
          const live = pickForDept(lives, store.key)
          const statusLabel = live?.status === 'live' ? 'LIVE' : live ? '방송 예정' : '방송 준비중'
          return (
            <Link
              key={store.key}
              to={`/live?dept=${store.key}`}
              className="block border border-rule focus:outline-none focus-visible:shadow-ring"
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-rule bg-quiet/40">
                <img src={store.logo} alt="" className="h-5 w-auto object-contain" />
                <span className="text-[13px] font-bold text-ink">{store.name}</span>
              </div>
              <div className="relative aspect-square overflow-hidden bg-quiet">
                {live?.thumbnail_url ? (
                  <img src={live.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlaceholder />
                )}
                <span
                  className={`absolute top-2 left-2 text-paper text-[11px] font-bold px-1.5 py-0.5 ${
                    live?.status === 'live' ? 'bg-signal-red' : 'bg-ink/70'
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
              {live && (
                <p className="px-3 py-2 text-[12.5px] text-ink line-clamp-1">{live.title}</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
