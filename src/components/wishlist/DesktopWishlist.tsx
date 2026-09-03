import { useNavigate } from 'react-router-dom'
import { IconHeart } from '../common/Icon'
import ImagePlaceholder from '../common/ImagePlaceholder'
import DesktopHeader from '../layout/DesktopHeader'
import type { WishlistLine } from '../../lib/wishlist'

interface Props {
  loggedIn: boolean
  lines: WishlistLine[]
  onRemove: (line: WishlistLine) => void
}

// PC 버전 — 찜 목록을 4열 그리드로. 빈 상태/비로그인 상태는 중앙 안내만 넓혀서 재사용.
export default function DesktopWishlist({ loggedIn, lines, onRemove }: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-paper min-h-screen">
      <DesktopHeader />

      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <h1 className="text-[22px] font-bold text-ink mb-8">찜 목록</h1>

        {!loggedIn ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconHeart className="w-10 h-10 mb-4 text-ink-faint" />
            <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
            <button
              onClick={() => navigate('/app/login', { state: { from: '/app/wishlist' } })}
              className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
            >
              로그인하기
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <IconHeart className="w-10 h-10 mb-4 text-ink-faint" />
            <p className="text-[16px] font-bold text-ink mb-2">찜한 상품이 없어요</p>
            <p className="text-[13px] text-ink-soft mb-6">마음에 드는 상품을 찜해보세요</p>
            <button
              onClick={() => navigate('/app/home')}
              className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
            >
              쇼핑 계속하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-5">
            {lines.map((line) => {
              const p = line.product
              const sell = p.sale_price ?? p.price
              return (
                <div key={line.id} className="relative">
                  <button
                    onClick={() => onRemove(line)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 bg-paper border border-rule flex items-center justify-center text-ink focus:outline-none focus-visible:shadow-ring"
                    aria-label="찜 해제"
                  >
                    <IconHeart filled className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigate(`/app/product/${p.id}`)} className="text-left w-full focus:outline-none focus-visible:shadow-ring">
                    <div className="aspect-square overflow-hidden bg-quiet">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlaceholder />
                      )}
                    </div>
                    <p className="text-[13.5px] text-ink mt-2 line-clamp-1">{p.name}</p>
                    <p className="text-[14px] font-bold tabular-nums text-ink mt-0.5">{sell.toLocaleString('ko-KR')}원</p>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
