import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live, LiveCoupon, Product } from '../../lib/types'
import { won } from '../../lib/format'
import { streamIframeSrc } from '../../lib/cloudflare'
import { useLiveChat } from '../../hooks/useLiveChat'
import { useStreamStatus } from '../../hooks/useStreamStatus'
import { useLiveHearts } from '../../hooks/useLiveHearts'
import { subscribeToPush } from '../../lib/pushNotifications'
import { IconHeartFilled, IconSend2, IconUserCircle, IconBrandFacebook, IconBrandX, IconLink, IconBellPlus, IconBellFilled } from '@tabler/icons-react'
import { couponLabel, couponRemaining, couponSoldOut } from '../../lib/coupons'
import DesktopLiveWatch from '../../components/live/DesktopLiveWatch'
import ViewModeToggle from '../../components/layout/ViewModeToggle'
import { useViewMode } from '../../lib/viewMode'

const statusLabel: Record<Live['status'], string> = {
  live: 'LIVE',
  scheduled: '예정',
  ended: '종료',
}

// 유튜브 링크(브랜드 공식 영상 등)를 임베드 플레이어 주소로 변환 — 다시보기/예시 콘텐츠용
const youtubeEmbedSrc = (url: string | null | undefined, autoplay = false): string | null => {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0${autoplay ? '&autoplay=1' : ''}` : null
}

// 유튜브ID만 추출 — 썸네일(hqdefault) 주소 생성용
const youtubeVideoId = (url: string | null | undefined): string | null => {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/)
  return m ? m[1] : null
}

// 채팅용 이모지 — 표준 유니코드 문자만 사용(저작권 문제 없음, 카카오 캐릭터 이모티콘 아님)
const CHAT_EMOJIS = [
  '😍', '❤️', '👍', '🔥', '😂', '😮', '👏', '🎉',
  '💯', '🙌', '✨', '💄', '💅', '🛍️', '😊', '🥰',
  '😘', '👀', '🤩', '😭', '🙏', '💖', '🎁', '⭐',
]

const textShadow = { textShadow: '0 1px 5px rgba(0,0,0,.55)' }

// 채팅 아이디 색 — 닉네임마다 파랑/빨강 중 하나로 고정 배정(같은 사람은 항상 같은 색)
const NICK_COLORS = ['#4FC3F7', '#FF5252']
const nicknameColor = (nickname: string): string => {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) hash = (hash * 31 + nickname.charCodeAt(i)) | 0
  return NICK_COLORS[Math.abs(hash) % NICK_COLORS.length]
}

export default function ShopLiveWatch() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mode, isDesktop, toggle } = useViewMode()

  const [live, setLive] = useState<Live | null>(null)
  const [hostName, setHostName] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [liveCoupon, setLiveCoupon] = useState<LiveCoupon | null>(null)
  const [productSheetOpen, setProductSheetOpen] = useState(false)
  const [hostSheetOpen, setHostSheetOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  // partnerName 값은 아직 화면에서 안 쓰지만 로딩 로직이 setter를 호출하므로 setter만 유지
  const [, setPartnerName] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [youtubePlaying, setYoutubePlaying] = useState(false)

  // 구매 폼 상태 — 수량만 고르고 정식 주문/결제 페이지(/app/order)로 넘긴다
  const [buyProduct, setBuyProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)

  // 실시간 채팅 (판매자 LiveDetail 과 동일 훅/채널 공유 → 양방향)
  const { messages, loading: chatLoading, isLoggedIn, sendMessage: sendChat } = useLiveChat(id)
  const [chatInput, setChatInput] = useState<string>('')

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return
    const ok = await sendChat(chatInput)
    if (ok) setChatInput('')
  }

  // 좋아요 하트 — 탭할 때마다 화면에 하트가 떠오르고, 다른 시청자 화면에도 실시간으로 같이 뜬다
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])
  const heartSeq = useRef(0)
  const spawnHeart = useCallback(() => {
    const heartId = heartSeq.current++
    const x = Math.round(Math.random() * 60 - 30) // -30~30px 랜덤 흔들림
    setHearts((prev) => [...prev, { id: heartId, x }])
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId))
    }, 1800)
  }, [])
  const { sendHeart } = useLiveHearts(id, spawnHeart)
  const tapHeart = () => {
    spawnHeart()
    sendHeart()
  }

  // 공유 — OS 기본 공유시트(옵션이 너무 많아 복잡) 대신 자체 소형 메뉴 사용
  const shareUrl = () => window.location.href
  const shareTitle = live?.title ?? '뷰티그라운드 라이브'

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 1600)
    } catch {
      // 클립보드 권한이 없는 환경 — 조용히 무시
    }
    setShareMenuOpen(false)
  }

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`, '_blank', 'noopener,width=600,height=500')
    setShareMenuOpen(false)
  }

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(shareTitle)}`, '_blank', 'noopener,width=600,height=500')
    setShareMenuOpen(false)
  }

  // 카카오톡 SDK 미연동 — 링크만 복사해서 대화방에 붙여넣도록 안내
  const shareToKakao = async () => {
    await copyShareLink()
  }

  // 브랜드 팔로우 — 다음 라이브 알림 대상이 되는 관계. 비로그인이면 로그인으로 보냄
  const toggleFollow = async () => {
    if (!live?.partner_id) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/app/login', { state: { from: `/app/live/${live.id}` } })
      return
    }
    if (isFollowing) {
      setIsFollowing(false)
      await supabase.from('partner_follows').delete().eq('user_id', session.user.id).eq('partner_id', live.partner_id)
    } else {
      setIsFollowing(true)
      await supabase.from('partner_follows').insert([{ user_id: session.user.id, partner_id: live.partner_id }])
      // 팔로우한 브랜드가 다음에 라이브를 켜면 실제 알림이 오도록 푸시 구독 유도. 거부/미지원이면 조용히 무시.
      void subscribeToPush()
    }
  }

  // 채팅 — 이모지 삽입 + 닉네임 탭해서 멘션(@닉네임)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const insertEmoji = (emoji: string) => {
    setChatInput((prev) => prev + emoji)
    chatInputRef.current?.focus()
  }
  const mentionUser = (nickname: string) => {
    setChatInput(`@${nickname} `)
    setEmojiOpen(false)
    chatInputRef.current?.focus()
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data: liveData } = await supabase
        .from('lives')
        .select('*')
        .eq('id', id)
        .single()

      if (!active) return
      const liveRow = (liveData ?? null) as Live | null
      setLive(liveRow)

      if (liveRow?.host_id) {
        const { data: hostData } = await supabase
          .from('hosts')
          .select('name')
          .eq('id', liveRow.host_id)
          .single()
        if (active) setHostName(hostData?.name ?? null)
      } else {
        setHostName(null)
      }

      if (liveRow?.partner_id) {
        const { data: partnerData } = await supabase
          .from('partners')
          .select('brand_name')
          .eq('id', liveRow.partner_id)
          .single()
        if (active) setPartnerName(partnerData?.brand_name ?? null)

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: followRow } = await supabase
            .from('partner_follows')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('partner_id', liveRow.partner_id)
            .maybeSingle()
          if (active) setIsFollowing(!!followRow)
        }
      } else {
        setPartnerName(null)
      }

      if (liveRow && liveRow.product_ids && liveRow.product_ids.length > 0) {
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .in('id', liveRow.product_ids)
        if (!active) return
        setProducts((prodData ?? []) as Product[])
      } else {
        setProducts([])
      }
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  // 라이브 한정 쿠폰 — 있으면 배너로 노출(실제 적용/차감은 주문 페이지에서)
  useEffect(() => {
    if (!id) return
    let active = true
    supabase
      .from('live_coupons')
      .select('*')
      .eq('live_id', id)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setLiveCoupon(data as LiveCoupon | null)
      })
    return () => { active = false }
  }, [id])

  // 판매자 조작(지금판매·공지핀·방송상태)을 실시간 수신 — lives 행 UPDATE 구독
  useEffect(() => {
    if (!id) return
    const ch = supabase
      .channel(`live-sync:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${id}` },
        (payload) => {
          setLive((prev) => (prev ? { ...prev, ...(payload.new as Partial<Live>) } : prev))
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [id])

  const openBuy = (product: Product) => {
    setProductSheetOpen(false)
    setBuyProduct(product)
    setQuantity(1)
  }

  const closeBuy = () => {
    setBuyProduct(null)
  }

  // 정식 주문/결제 페이지로 이동 — 라이브 출처(live_id)를 태깅해서 넘긴다
  const goToOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!buyProduct || !live) return
    // 비회원 구매 허용(2026-08-18) — 로그인 없이 바로 주문서로. 주문서에서 로그인 유도만 한다.
    const qty = quantity < 1 ? 1 : quantity
    navigate('/app/order', {
      state: {
        items: [
          {
            product_id: buyProduct.id,
            name: buyProduct.name,
            price: buyProduct.sale_price ?? buyProduct.price,
            quantity: qty,
            thumbnail: buyProduct.thumbnail_url ?? null,
          },
        ],
        liveId: live.id,
      },
    })
  }

  // 판매자가 "지금 판매"로 지정한 상품을 목록 맨 위로
  const highlightId = live?.highlight_product_id ?? null
  const orderedProducts = highlightId
    ? [...products].sort((a, b) => (a.id === highlightId ? -1 : b.id === highlightId ? 1 : 0))
    : products
  const primaryProduct = orderedProducts[0] ?? null

  const streamSrc = streamIframeSrc(live?.stream_uid)
  // 실제 송출 연결 여부 — status='live'인데 송출이 끊겨 있으면 대기 화면을 보여주고,
  // 폴링으로 연결이 감지되면 자동으로 플레이어로 전환된다. 조회 실패(unknown)면 차단하지 않는다.
  const streamState = useStreamStatus(live?.stream_uid, live?.status === 'live')
  const waitingForStream = live?.status === 'live' && streamState === 'disconnected'
  const onAir = live?.status === 'live' && Boolean(live.stream_uid) && streamState !== 'disconnected'
  const topBadge = onAir ? 'LIVE' : live && live.status === 'live' ? '준비중' : live ? statusLabel[live.status] : ''

  const inputClass =
    'w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition'

  const recentMessages = messages.slice(-4)

  if (isDesktop && live) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopLiveWatch
          live={live}
          hostName={hostName}
          topBadge={topBadge}
          onAir={onAir}
          waitingForStream={waitingForStream}
          streamSrc={streamSrc}
          youtubeEmbedSrc={youtubeEmbedSrc(live.stream_url)}
          liveCoupon={liveCoupon}
          orderedProducts={orderedProducts}
          highlightId={highlightId}
          onBuy={openBuy}
          hearts={hearts}
          onHeart={tapHeart}
          messages={messages}
          chatLoading={chatLoading}
          isLoggedIn={isLoggedIn}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChatMessage={sendChatMessage}
          mentionUser={mentionUser}
          onBack={() => navigate(-1)}
          buyProduct={buyProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          closeBuy={closeBuy}
          goToOrder={goToOrder}
        />
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-0 bg-black flex justify-center">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="relative w-full h-full max-w-[480px] overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white/70 text-[14px]">불러오는 중…</div>
        ) : !live ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/80 text-[14px] px-6 text-center">
            <p>라이브를 찾을 수 없습니다.</p>
            <Link to="/app/home" className="text-gold-light font-medium">홈으로</Link>
          </div>
        ) : (
          <>
            {/* 비디오 배경 (화면 전체) */}
            <div className="absolute inset-0 bg-[#14120e]">
              {waitingForStream ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={
                    live.thumbnail_url
                      ? { backgroundImage: `url(${live.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                >
                  <div className="absolute inset-0 bg-black/45" />
                  <p className="relative text-white text-[15px] font-bold mb-1">방송 준비 중입니다</p>
                  <p className="relative text-white/80 text-[12px]">잠시 후 자동으로 시작됩니다</p>
                </div>
              ) : streamSrc ? (
                <iframe
                  src={streamSrc}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none' }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  title="라이브 영상"
                />
              ) : youtubeEmbedSrc(live.stream_url) ? (
                youtubePlaying ? (
                  <iframe
                    src={youtubeEmbedSrc(live.stream_url, true) as string}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="다시보기 영상"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setYoutubePlaying(true)}
                    aria-label="재생"
                    className="absolute inset-0 w-full h-full flex items-center justify-center"
                    style={{
                      backgroundImage: `url(${live.thumbnail_url ?? `https://img.youtube.com/vi/${youtubeVideoId(live.stream_url)}/hqdefault.jpg`})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/25" />
                    <span className="relative w-20 h-20 rounded-full bg-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center justify-center">
                      <img src="/images/bg-logo-mark-transparent.png" alt="" className="w-11 h-11 object-contain" />
                    </span>
                  </button>
                )
              ) : live.stream_url ? (
                <video
                  controls
                  src={live.stream_url}
                  poster={live.thumbnail_url ?? undefined}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={
                    live.thumbnail_url
                      ? { backgroundImage: `url(${live.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                >
                  {!live.thumbnail_url && (
                    <img src="/images/bg-logo-icon.png" alt="" className="w-20 h-20 rounded-2xl object-contain opacity-90" />
                  )}
                </div>
              )}
            </div>

            {/* 상단 스크림 + 헤더 */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20" />
            <div
              className="absolute inset-x-0 z-30 flex items-center gap-2 px-4"
              style={{ top: 'max(14px, env(safe-area-inset-top))' }}
            >
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="뒤로"
                className="shrink-0 w-8 h-8 rounded-full bg-black/35 text-white flex items-center justify-center text-[17px]"
              >
                ‹
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-medium truncate" style={textShadow}>
                  {live.title}
                </p>
                {hostName && (
                  <p className="text-white/75 text-[11px] truncate" style={textShadow}>
                    {hostName} 진행
                  </p>
                )}
              </div>
              <span className="shrink-0 flex items-center gap-1.5 rounded-pill bg-black/40 text-white text-[11px] font-bold px-2.5 py-1">
                {onAir && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5470] animate-pulse" />}
                {topBadge}
              </span>
            </div>

            {/* 떠오르는 좋아요 하트 */}
            {onAir && (
              <div className="absolute z-25 pointer-events-none" style={{ right: 30, bottom: 200 }}>
                {hearts.map((h) => (
                  <IconHeartFilled
                    key={h.id}
                    size={28}
                    className="absolute bottom-0 right-0 text-[#ff4d6d] animate-float-heart"
                    style={{ marginRight: h.x }}
                  />
                ))}
              </div>
            )}

            {/* 우측 아이콘 레일 */}
            <div className="absolute right-3 z-30 flex flex-col items-center gap-4" style={{ bottom: 152 }}>
              {hostName && (
                <button type="button" onClick={() => setHostSheetOpen(true)} aria-label="진행자 정보" className="flex flex-col items-center transition-transform hover:scale-[1.08] active:scale-90">
                  <span className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                    <IconUserCircle size={22} className="text-white" />
                  </span>
                </button>
              )}
              <button type="button" onClick={tapHeart} aria-label="좋아요" className="flex flex-col items-center transition-transform hover:scale-[1.08] active:scale-90">
                <span className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <IconHeartFilled size={21} className="text-[#ff4d6d]" />
                </span>
              </button>
              <div className="relative">
                <button type="button" onClick={() => setShareMenuOpen((v) => !v)} aria-label="공유" className="flex flex-col items-center transition-transform hover:scale-[1.08] active:scale-90">
                  <span className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                    <IconSend2 size={19} className="text-white" />
                  </span>
                </button>
                {shareCopied && (
                  <span className="absolute right-14 top-3 whitespace-nowrap bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-md">
                    링크를 복사했어요
                  </span>
                )}
                {shareMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShareMenuOpen(false)} />
                    <div className="absolute right-[54px] top-1/2 -translate-y-1/2 z-40 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.35)] p-2.5 flex items-center gap-2">
                      <button type="button" onClick={() => void shareToKakao()} aria-label="카카오톡 공유" className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FEE500' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="rgba(0,0,0,0.85)" d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.66l-.95 3.52c-.08.31.27.56.54.38l4.19-2.79c.51.05 1.03.08 1.56.08 5.52 0 10-3.54 10-7.85C22 6.54 17.52 3 12 3z" />
                        </svg>
                      </button>
                      <button type="button" onClick={shareToFacebook} aria-label="페이스북 공유" className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
                        <IconBrandFacebook size={20} className="text-white" />
                      </button>
                      <button type="button" onClick={shareToX} aria-label="X 공유" className="w-11 h-11 rounded-full bg-black flex items-center justify-center shrink-0">
                        <IconBrandX size={18} className="text-white" />
                      </button>
                      <button type="button" onClick={() => void copyShareLink()} aria-label="링크 복사" className="w-11 h-11 rounded-full bg-quiet flex items-center justify-center shrink-0">
                        <IconLink size={18} className="text-ink" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              {live?.partner_id && (
                <button type="button" onClick={() => void toggleFollow()} aria-label={isFollowing ? '팔로우 취소' : '팔로우'} className="flex flex-col items-center transition-transform hover:scale-[1.08] active:scale-90">
                  <span className={`w-[46px] h-[46px] rounded-full backdrop-blur-md flex items-center justify-center ${isFollowing ? 'bg-signal-yellow' : 'bg-white/15'}`}>
                    {isFollowing ? (
                      <IconBellFilled size={20} className="text-ink" />
                    ) : (
                      <IconBellPlus size={20} className="text-white" />
                    )}
                  </span>
                </button>
              )}
            </div>

            {/* 하단 스크림 */}
            <div
              className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none z-20"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 25%, rgba(40,40,40,0.65) 50%, rgba(100,100,100,0.4) 75%, rgba(180,180,180,0.15) 90%, transparent 100%)',
              }}
            />

            {/* 하단 스택: 쿠폰 배너 → 공지 → 채팅 피드 → 상품 카드 → 입력줄 (채팅이 먼저, 구매 동선은 입력줄 바로 위) */}
            {/* 컨테이너 자체는 pointer-events-none — inset-x-0라 실제 콘텐츠가 없는 우측 여백(mr-14)까지
                클릭을 가로채 우측 아이콘 레일을 덮어버리는 문제가 있었음. 실제 상호작용 요소에만 auto로 되살림. */}
            <div
              className="absolute inset-x-0 bottom-0 z-30 px-3 flex flex-col gap-2 pointer-events-none"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
            >
              {liveCoupon && !couponSoldOut(liveCoupon) && (
                <div className="mr-14 bg-black/45 backdrop-blur-sm border border-gold/40 rounded-lg px-3 py-2">
                  <p className="text-[11.5px] font-bold text-gold-light">
                    🎉 라이브 한정 쿠폰 · {couponLabel(liveCoupon)}
                    {couponRemaining(liveCoupon) !== null && ` · 선착순 ${couponRemaining(liveCoupon)}건`}
                  </p>
                </div>
              )}

              {live.pinned_message && (
                <div className="mr-14 flex items-start gap-1.5 bg-black/45 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <span className="shrink-0 text-[11px]" aria-hidden="true">📌</span>
                  <p className="text-[11.5px] text-white leading-snug whitespace-pre-line" style={textShadow}>{live.pinned_message}</p>
                </div>
              )}

              {/* 채팅 메시지 — 새 메시지가 위로 쌓이며 자연스레 입력줄과 가까워짐 */}
              <div className="mr-14 flex flex-col gap-1.5 pointer-events-auto">
                {recentMessages.map((m) => (
                  <p key={m.id} className="text-[12.5px] text-white leading-snug" style={textShadow}>
                    <button
                      type="button"
                      onClick={() => mentionUser(m.nickname ?? '익명')}
                      className="font-bold mr-1"
                      style={{ color: nicknameColor(m.nickname ?? '익명') }}
                    >
                      {m.nickname ?? '익명'}
                    </button>
                    {m.message}
                  </p>
                ))}
              </div>

              {/* 상품 카드 — 채팅 바로 아래, 입력줄 바로 위에 고정해 구매 동선을 마지막에 배치 */}
              {primaryProduct && (() => {
                const sell = primaryProduct.sale_price ?? primaryProduct.price
                const hasSale = primaryProduct.sale_price != null && primaryProduct.sale_price < primaryProduct.price
                const rate = hasSale ? Math.round((1 - (primaryProduct.sale_price as number) / primaryProduct.price) * 100) : 0
                const isSelling = primaryProduct.id === highlightId
                // 흰색 상품카드(더캐스트 참고): 썸네일 | 이름+할인율·가격 | 상품보기 버튼
                return (
                  <div className="mr-14 flex items-stretch bg-white rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.3)] pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => openBuy(primaryProduct)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 p-2 text-left"
                    >
                      {primaryProduct.thumbnail_url ? (
                        <img src={primaryProduct.thumbnail_url} alt={primaryProduct.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <img src="/images/bg-logo-mark.png" alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        {isSelling && (
                          <p className="flex items-center gap-1 text-[9.5px] font-extrabold text-[#e8402a] mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e8402a] animate-pulse" />
                            지금 판매중
                          </p>
                        )}
                        <p className="text-[12.5px] text-text font-medium truncate">{primaryProduct.name}</p>
                        <p className="mt-0.5 flex items-baseline gap-1.5">
                          {hasSale && <span className="text-[14px] font-extrabold text-[#e8402a]">{rate}%</span>}
                          <span className="text-[15px] font-extrabold text-text">{won(sell)}</span>
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => (products.length > 1 ? setProductSheetOpen(true) : openBuy(primaryProduct))}
                      className="self-stretch px-4 flex items-center justify-center border-l border-cream-2 text-[12px] font-semibold text-text-sub leading-tight shrink-0 text-center"
                    >
                      {products.length > 1 ? <>외<br />{products.length - 1}개</> : <>상품<br />보기</>}
                    </button>
                  </div>
                )
              })()}

              <div className="relative flex items-center gap-2 pointer-events-auto">
                {emojiOpen && (
                  <div className="absolute bottom-11 left-0 right-14 bg-[#1c1912]/95 backdrop-blur rounded-xl p-2 grid grid-cols-8 gap-0.5 border border-white/10">
                    {CHAT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="text-[17px] py-1 rounded hover:bg-white/10"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  disabled={!isLoggedIn}
                  aria-label="이모지"
                  className="shrink-0 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] disabled:opacity-40"
                >
                  🙂
                </button>
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onFocus={() => setEmojiOpen(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage() }}
                  disabled={!isLoggedIn}
                  placeholder={isLoggedIn ? '메시지를 입력하세요…' : '로그인 후 채팅 참여 가능'}
                  className="flex-1 min-w-0 h-10 rounded-[10px] bg-white px-3.5 text-[13px] text-[#555] placeholder:text-[#888] shadow-[0_4px_12px_rgba(0,0,0,0.3)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendChatMessage}
                  disabled={!isLoggedIn}
                  aria-label="전송"
                  className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] shadow-[0_6px_16px_rgba(255,20,147,0.5)] transition-transform hover:scale-105 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #FF1493 100%)' }}
                >
                  <IconSend2 size={18} />
                </button>
              </div>
              {chatLoading ? null : !isLoggedIn && (
                <p className="text-[10.5px] text-white/60 text-center">로그인 후 채팅 참여 가능 (읽기는 누구나 가능)</p>
              )}
            </div>

            {/* 전체 판매 상품 시트 */}
            {productSheetOpen && (
              <div className="absolute inset-0 z-40 bg-black/50 flex items-end" onClick={() => setProductSheetOpen(false)}>
                <div
                  className="w-full max-h-[75%] bg-white rounded-t-2xl overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-cream-2">
                    <h2 className="text-[15px] font-bold text-text">판매 상품</h2>
                    <button type="button" onClick={() => setProductSheetOpen(false)} aria-label="닫기" className="text-text-hint text-[18px] leading-none">✕</button>
                  </div>

                  {live.description && (
                    <p className="px-4 pt-3 text-[13px] text-text-sub leading-relaxed whitespace-pre-line">{live.description}</p>
                  )}

                  <div className="p-4 flex flex-col gap-3">
                    {orderedProducts.map((product) => {
                      const hasSale = product.sale_price != null && product.sale_price < product.price
                      const isHighlight = product.id === highlightId
                      return (
                        <div
                          key={product.id}
                          className={`bg-white rounded-md border p-3 ${isHighlight ? 'ring-2 ring-gold' : ''}`}
                          style={{ borderColor: isHighlight ? '#b8924a' : '#e5e0d8', borderWidth: '0.5px' }}
                        >
                          {isHighlight && (
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-gold mb-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                              지금 방송에서 판매 중
                            </p>
                          )}
                          <div className="flex items-center gap-3">
                            {product.thumbnail_url ? (
                              <img src={product.thumbnail_url} alt={product.name} className="w-16 h-16 rounded-md object-cover shrink-0" />
                            ) : (
                              <img src="/images/bg-logo-mark.png" alt="" className="w-16 h-16 rounded-md object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-text line-clamp-1">{product.name}</p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-[15px] font-bold text-text">{won(product.sale_price ?? product.price)}</span>
                                {hasSale && <span className="text-[12px] text-text-hint line-through">{won(product.price)}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openBuy(product)}
                              className="shrink-0 rounded-pill bg-gold text-white hover:bg-gold-light text-[13px] font-medium px-4 py-2 transition-colors"
                            >
                              구매하기
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 진행자 정보 시트 */}
            {hostSheetOpen && (
              <div className="absolute inset-0 z-40 bg-black/50 flex items-end" onClick={() => setHostSheetOpen(false)}>
                <div
                  className="w-full bg-white rounded-t-2xl p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-bold text-text">진행자 정보</h2>
                    <button type="button" onClick={() => setHostSheetOpen(false)} aria-label="닫기" className="text-text-hint text-[18px] leading-none">✕</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-14 h-14 rounded-full bg-cream-2 flex items-center justify-center shrink-0">
                      <IconUserCircle size={28} className="text-text-hint" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-text truncate">{hostName}</p>
                      <p className="text-[12.5px] text-text-sub mt-0.5">이 방송을 진행하고 있어요</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 구매 모달 */}
      {buyProduct && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center"
          onClick={closeBuy}
        >
          <div
            className="w-full sm:max-w-[420px] bg-white rounded-t-md sm:rounded-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={goToOrder}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-[16px] font-bold text-text">구매하기</h3>
                <button
                  type="button"
                  onClick={closeBuy}
                  className="text-text-hint text-[18px] leading-none"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-[14px] font-medium text-text line-clamp-1">
                  {buyProduct.name}
                </p>
                <p className="text-[15px] font-bold text-gold mt-1">
                  {won(buyProduct.sale_price ?? buyProduct.price)}
                </p>
              </div>

              <div>
                <label className="block text-[13px] text-text-sub mb-1.5">
                  수량
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between mt-4 mb-1">
                <span className="text-[13px] text-text-sub">결제 금액</span>
                <span className="text-[16px] font-bold text-text">
                  {won(
                    (buyProduct.sale_price ?? buyProduct.price) *
                      (quantity < 1 ? 1 : quantity)
                  )}
                </span>
              </div>

              <button
                type="submit"
                className="w-full mt-4 rounded-pill bg-gold text-white hover:bg-gold-light text-[14px] font-medium py-3 transition-colors"
              >
                주문하러 가기
              </button>

              <p className="text-[11px] text-text-hint mt-3 text-center leading-relaxed">
                배송지 입력과 결제는 주문 페이지에서 진행됩니다.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
