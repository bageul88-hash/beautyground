import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { streamIframeSrc } from '../../lib/cloudflare'
import { useLiveChat } from '../../hooks/useLiveChat'
import { useStreamStatus } from '../../hooks/useStreamStatus'
import { won } from '../../lib/format'
import type { Live, Product } from '../../lib/types'

// 방송 지원(운영) 화면 — 2026-09-02 신설.
// 배경: 진행자에게 링크(/host/go/:token)만 주는 방식에는 상품 선택 UI가 없어서, 링크를 받은
// 진행자는 판매 상품을 스스로 걸 수 없다. 그래서 운영팀이 대신 걸어줘야 한다.
// 이 화면 하나에서 ①시청자와 똑같은 방송 화면 ②채팅 응대(매니저로 표시) ③판매 상품 편집을
// 전부 한다. PC·모바일 둘 다 쓰도록 한 열/두 열로 접힌다.

type ProductRow = Pick<Product, 'id' | 'name' | 'price' | 'thumbnail_url'> & {
  brand: string | null
  sale_price: number | null
  stock: number | null
}

export default function LiveSupport() {
  const { id } = useParams<{ id: string }>()
  const [live, setLive] = useState<Live | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [allProducts, setAllProducts] = useState<ProductRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const [soundOn, setSoundOn] = useState(false)

  const { messages, loading: chatLoading, sendMessage } = useLiveChat(id)
  const [chatInput, setChatInput] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const streamState = useStreamStatus(live?.stream_uid, live?.status === 'live', 5000)

  const load = useCallback(async () => {
    if (!id) return
    const { data, error } = await supabase.from('lives').select('*').eq('id', id).maybeSingle()
    if (error || !data) {
      setErr('방송을 불러오지 못했습니다.')
      setLoading(false)
      return
    }
    const row = data as Live
    setLive(row)
    setSelectedIds(row.product_ids ?? [])
    setHighlightId(row.highlight_product_id ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  // 상품 목록 — 판매중인 것만. 검색은 브라우저에서 처리(수백 개 규모라 충분).
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, brand, name, price, sale_price, stock, thumbnail_url')
        .eq('status', 'on_sale')
        .order('brand', { ascending: true })
        .limit(1000)
      setAllProducts((data ?? []) as ProductRow[])
    })()
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const byId = useMemo(() => {
    const m = new Map<string, ProductRow>()
    allProducts.forEach((p) => m.set(p.id, p))
    return m
  }, [allProducts])

  const selected = useMemo(
    () => selectedIds.map((pid) => byId.get(pid)).filter((p): p is ProductRow => Boolean(p)),
    [selectedIds, byId]
  )

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allProducts
      .filter((p) => !selectedIds.includes(p.id))
      .filter((p) =>
        q ? `${p.brand ?? ''} ${p.name}`.toLowerCase().includes(q) : true
      )
      .slice(0, 40)
  }, [allProducts, selectedIds, search])

  const addProduct = (pid: string) => {
    setSelectedIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]))
    setSavedMsg(null)
  }
  const removeProduct = (pid: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== pid))
    if (highlightId === pid) setHighlightId(null)
    setSavedMsg(null)
  }
  const moveProduct = (pid: string, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const i = prev.indexOf(pid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setSavedMsg(null)
  }

  // 저장 — 방송 중에도 즉시 반영된다(시청자 화면은 lives 변경을 실시간 구독).
  const save = async () => {
    if (!id) return
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('lives')
      .update({ product_ids: selectedIds, highlight_product_id: highlightId })
      .eq('id', id)
    setSaving(false)
    if (error) {
      setErr(`저장 실패: ${error.message}`)
      return
    }
    setSavedMsg(`저장했습니다 — 판매 상품 ${selectedIds.length}개`)
    void load()
  }

  const send = async () => {
    if (!chatInput.trim()) return
    const ok = await sendMessage(chatInput)
    if (ok) setChatInput('')
  }

  // 종료된 방송은 녹화본을, 진행 중이면 라이브 채널을 그대로 본다(시청자와 동일).
  const replaySrc =
    live?.status === 'ended' && live.playback_url && /cloudflarestream\.com/.test(live.playback_url)
      ? `${live.playback_url}${live.playback_url.includes('?') ? '&' : '?'}autoplay=true${
          soundOn ? '' : '&muted=true'
        }`
      : null
  const videoSrc = replaySrc ?? streamIframeSrc(live?.stream_uid, { autoplay: true, muted: !soundOn })

  if (loading) return <div className="p-8 text-[14px] text-ink-soft">불러오는 중…</div>
  if (!live) return <div className="p-8 text-[14px] text-signal-red">{err ?? '방송을 찾을 수 없습니다.'}</div>

  const statusLabel =
    live.status === 'live' ? (streamState === 'connected' ? '● 방송중' : '방송중(송출 대기)') : live.status === 'scheduled' ? '예정' : '종료'

  return (
    <div className="bg-quiet min-h-screen">
      <div className="bg-paper border-b border-rule sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/admin/lives" className="text-[13px] font-bold text-ink-soft hover:text-ink shrink-0">
            ← 방송 목록
          </Link>
          <p className="flex-1 min-w-0 text-[14px] font-bold text-ink truncate text-center">{live.title}</p>
          <span
            className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-control ${
              live.status === 'live' ? 'bg-signal-blue/10 text-signal-blue' : 'bg-quiet text-ink-soft'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
        {/* 방송 화면 — 시청자와 동일. 진행자가 세로로 촬영하므로 9:16. */}
        <div>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[380px] bg-[#14120e] border border-rule overflow-hidden">
            {videoSrc ? (
              <>
                <iframe
                  src={videoSrc}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none' }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  title="방송 화면"
                />
                {!soundOn && (
                  <button
                    type="button"
                    onClick={() => setSoundOn(true)}
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/70 text-white text-[12px] font-semibold px-3 py-1.5"
                  >
                    🔇 소리 켜기
                  </button>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[13px]">
                송출 채널이 아직 없습니다
              </div>
            )}
          </div>
          <p className="mt-2 text-[12px] text-ink-soft text-center">
            시청자 화면{' '}
            <Link to={`/app/live/${live.id}`} target="_blank" className="underline">
              열기
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
          {/* 판매 상품 관리 */}
          <section className="bg-paper border border-rule">
            <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">판매 상품</p>
              <span className="text-[12px] text-ink-soft">{selectedIds.length}개</span>
            </div>

            <div className="p-4 space-y-3">
              {selected.length === 0 ? (
                <p className="text-[12.5px] text-ink-soft py-3">
                  아직 걸린 상품이 없습니다. 아래에서 검색해 추가하세요.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {selected.map((p, idx) => (
                    <li key={p.id} className="flex items-center gap-2 border border-rule p-2">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt="" className="w-11 h-11 object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 bg-quiet shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-ink truncate">
                          {highlightId === p.id && (
                            <span className="text-signal-red font-bold mr-1">● 대표</span>
                          )}
                          <span className="text-ink-soft">{p.brand} </span>
                          {p.name}
                        </p>
                        <p className="text-[12px] font-bold text-ink">{won(p.sale_price ?? p.price)}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveProduct(p.id, -1)}
                          disabled={idx === 0}
                          className="text-[11px] text-ink-soft disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProduct(p.id, 1)}
                          disabled={idx === selected.length - 1}
                          className="text-[11px] text-ink-soft disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHighlightId(p.id)}
                        className="text-[11px] font-bold text-signal-blue px-1.5 shrink-0"
                      >
                        대표
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        className="text-[11px] font-bold text-signal-red px-1.5 shrink-0"
                      >
                        빼기
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="text-[13px] font-bold text-paper bg-ink rounded-control px-4 py-2 disabled:opacity-60"
                >
                  {saving ? '저장 중…' : '저장 (방송에 즉시 반영)'}
                </button>
                {savedMsg && <span className="text-[12px] text-signal-blue">{savedMsg}</span>}
                {err && <span className="text-[12px] text-signal-red">{err}</span>}
              </div>

              <div className="pt-2 border-t border-rule">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="브랜드 또는 상품명으로 검색"
                  className="w-full border border-rule px-3 py-2 text-[13px] focus:outline-none"
                />
                <ul className="mt-2 space-y-1 max-h-[260px] overflow-y-auto pr-1">
                  {candidates.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-quiet">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt="" className="w-9 h-9 object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 bg-quiet shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-ink truncate">
                          <span className="text-ink-soft">{p.brand} </span>
                          {p.name}
                        </p>
                        <p className="text-[11.5px] text-ink-soft">
                          {won(p.sale_price ?? p.price)} · 재고 {p.stock ?? 0}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(p.id)}
                        className="text-[11.5px] font-bold text-paper bg-ink px-2.5 py-1 rounded-control shrink-0"
                      >
                        담기
                      </button>
                    </li>
                  ))}
                  {candidates.length === 0 && (
                    <li className="text-[12px] text-ink-soft py-2">검색 결과가 없습니다.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* 채팅 응대 — 관리자가 보내면 '매니저'로 표시된다(useLiveChat). */}
          <section className="bg-paper border border-rule flex flex-col min-h-[420px]">
            <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">채팅 응대</p>
              <span className="text-[11.5px] text-ink-soft">보내면 매니저로 표시</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatLoading ? (
                <p className="text-[12.5px] text-ink-soft">불러오는 중…</p>
              ) : messages.length === 0 ? (
                <p className="text-[12.5px] text-ink-soft">아직 채팅이 없습니다.</p>
              ) : (
                messages.map((m) => (
                  <p key={m.id} className="text-[13px] text-ink leading-relaxed">
                    <span
                      className={`font-bold mr-1.5 ${
                        m.nickname === '매니저' ? 'text-signal-red' : 'text-signal-blue'
                      }`}
                    >
                      {m.nickname ?? '익명'}
                    </span>
                    {m.message}
                  </p>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t border-rule flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void send()
                }}
                placeholder="메시지를 입력하세요…"
                className="flex-1 border border-rule px-3 py-2 text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                className="text-[13px] font-bold text-paper bg-ink px-4 py-2 rounded-control"
              >
                보내기
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
