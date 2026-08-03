import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'
import { getWishlist, removeWish, type WishlistLine } from '../lib/wishlist'
import ImagePlaceholder from '../components/common/ImagePlaceholder'
import { IconHeart } from '../components/common/Icon'

export default function AppWishlist() {
  const navigate = useNavigate()
  const { mode, toggle } = useViewMode()
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [lines, setLines] = useState<WishlistLine[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      if (!session) { setLoggedIn(false); setLoading(false); return }
      const list = await getWishlist()
      if (!active) return
      setLines(list)
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const handleRemove = async (line: WishlistLine) => {
    setLines((prev) => prev.filter((l) => l.id !== line.id))
    await removeWish(line.product.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule flex items-center justify-center text-ink-faint text-[14px]">불러오는 중...</div>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <AppFrame>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <BackHeader title="찜 목록" />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <IconHeart className="w-10 h-10 mb-4 text-ink-faint" />
          <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
          <button
            onClick={() => navigate('/app/login', { state: { from: '/app/wishlist' } })}
            className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
          >
            로그인하기
          </button>
        </div>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <BackHeader title="찜 목록" />

      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
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
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          {lines.map((line) => {
            const p = line.product
            const sell = p.sale_price ?? p.price
            return (
              <div key={line.id} className="relative">
                <button
                  onClick={() => handleRemove(line)}
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
                  <p className="text-[13px] text-ink mt-1.5 line-clamp-1">{p.name}</p>
                  <p className="text-[13px] font-bold tabular-nums text-ink mt-0.5">{sell.toLocaleString('ko-KR')}원</p>
                </button>
              </div>
            )
          })}
        </div>
      )}

    </AppFrame>
  )
}
