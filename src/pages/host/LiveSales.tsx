import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconArrowLeft, IconEye } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyHost } from '../../lib/host'
import type { HostSaleRow, Live } from '../../lib/types'
import { formatDateTime, won } from '../../lib/format'
import { useLiveStreamChannel } from '../../hooks/useLiveStreamChannel'
import { useStreamStatus } from '../../hooks/useStreamStatus'

const STATUS: Record<Live['status'], { label: string; bg: string; text: string }> = {
  scheduled: { label: '예정', bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
  live:      { label: 'LIVE', bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
  ended:     { label: '완료', bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
}

export default function HostLiveSales() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [live, setLive] = useState<Live | null>(null)
  const [sales, setSales] = useState<HostSaleRow[]>([])

  // 방송 송출 채널 — 브랜드 담당자 없이도 진행자 본인이 직접 RTMPS 주소·키를 발급/조회
  const { streamInfo, streamErr, provisioning, createChannel } = useLiveStreamChannel(
    live?.id,
    Boolean(live?.stream_uid)
  )
  const streamState = useStreamStatus(live?.stream_uid, live?.status !== 'ended', 5000)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState('')
  const copy = async (label: string, value: string | null) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* 클립보드 미지원 브라우저 — 무시 */
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      const host = await getMyHost()
      if (!active) return
      if (!host || !id) { setLoading(false); return }

      const { data: liveRow } = await supabase.from('lives').select('*').eq('id', id).maybeSingle()
      if (!active) return
      const lr = liveRow as Live | null
      if (!lr || lr.host_id !== host.id) {
        setForbidden(true)
        setLoading(false)
        return
      }
      setLive(lr)

      const { data: saleRows } = await supabase
        .from('host_sales_view')
        .select('*')
        .eq('live_id', id)
        .order('created_at', { ascending: false })
      if (!active) return
      setSales((saleRows as HostSaleRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[14px] text-[#9a9080]">불러오는 중...</p>
      </div>
    )
  }

  if (forbidden || !live) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-[14px] border border-[#e5e0d8] p-10 text-center">
        <p className="text-[16px] font-semibold text-[#111] mb-3">방송을 찾을 수 없습니다</p>
        <Link to="/host/lives" className="text-[13px] text-ink font-medium hover:underline">
          내 방송 목록으로
        </Link>
      </div>
    )
  }

  const validSales = sales.filter((s) => ['paid', 'shipped', 'done'].includes(s.status))
  const totalSales = validSales.reduce((sum, s) => sum + s.amount, 0)
  const badge = STATUS[live.status]

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Link to="/host/lives" className="flex items-center gap-1.5 text-[13px] text-[#9a9080] hover:text-[#111] transition-colors shrink-0">
          <IconArrowLeft size={15} />
          내 방송
        </Link>
        <span className="text-[#ccc]">·</span>
        <p className="text-[13px] text-[#111] font-medium truncate flex-1 min-w-0">{live.title}</p>
        <span className={`shrink-0 text-[11px] font-bold px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {live.status !== 'ended' && (
        <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[#111]">방송 송출 정보</h3>
            {streamInfo && (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  streamState === 'connected'
                    ? 'bg-[#E8F6EC] text-[#1E7B3C]'
                    : 'bg-[#F3F1EC] text-[#9a9080]'
                }`}
              >
                {streamState === 'connected' ? '연결됨' : '송출 대기중'}
              </span>
            )}
          </div>

          {!streamInfo ? (
            <>
              <p className="text-[13px] text-[#555] mb-3">
                아직 송출 채널이 없습니다. 방송 시작 전 채널을 먼저 만들어주세요.
              </p>
              <button
                type="button"
                onClick={createChannel}
                disabled={provisioning}
                className="text-[13px] font-semibold text-white bg-ink rounded-full px-4 py-2 disabled:opacity-60"
              >
                {provisioning ? '채널 생성 중…' : '송출 채널 만들기'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-[#9a9080] mb-1">RTMPS 서버 URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] bg-[#faf8f4] border border-[#e5e0d8] rounded-md px-3 py-2 truncate">
                    {streamInfo.rtmpsUrl ?? '-'}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy('url', streamInfo.rtmpsUrl)}
                    className="shrink-0 text-[12px] text-ink font-medium"
                  >
                    {copied === 'url' ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-[#9a9080] mb-1">스트림 키</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] bg-[#faf8f4] border border-[#e5e0d8] rounded-md px-3 py-2 truncate">
                    {showKey ? streamInfo.streamKey ?? '-' : '••••••••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="shrink-0 text-[12px] text-[#9a9080] font-medium"
                  >
                    {showKey ? '숨기기' : '보기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copy('key', streamInfo.streamKey)}
                    className="shrink-0 text-[12px] text-ink font-medium"
                  >
                    {copied === 'key' ? '복사됨' : '복사'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#9a9080]">
                Larix Broadcaster·OBS 등 방송 송출 앱에 위 주소와 키를 입력하면 바로 송출을 시작할 수 있습니다.
              </p>
            </div>
          )}
          {streamErr && <p className="text-[12px] text-[#FF4757] mt-2">{streamErr}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6">
          <p className="text-[12px] text-[#9a9080] mb-2">총 판매액</p>
          <p className="font-serif text-[22px] font-bold text-ink">{won(totalSales)}</p>
        </div>
        <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6">
          <p className="text-[12px] text-[#9a9080] mb-2">판매 건수</p>
          <p className="font-serif text-[22px] font-bold text-[#111]">{validSales.length}건</p>
        </div>
        <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 col-span-2 lg:col-span-1">
          <p className="text-[12px] text-[#9a9080] mb-2 flex items-center gap-1"><IconEye size={13} />최고 동시 시청자</p>
          <p className="font-serif text-[22px] font-bold text-[#111]">{(live.peak_viewers ?? 0).toLocaleString()}명</p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-[#e5e0d8] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eee]">
          <h3 className="text-[13px] font-bold text-[#111]">판매 내역</h3>
        </div>
        {sales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-[#9a9080]">판매 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eee]">
                  {['브랜드', '상품명', '수량', '금액', '판매일시', '상태'].map((col) => (
                    <th key={col} className="text-left text-[11px] text-[#9a9080] font-medium px-5 py-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-[#eee] hover:bg-[#fdf9f5] transition-colors">
                    <td className="px-5 py-4 text-[13px] text-[#555] whitespace-nowrap">{s.brand_name ?? '-'}</td>
                    <td className="px-5 py-4 text-[13px] text-[#111]">{s.product_name ?? '-'}</td>
                    <td className="px-5 py-4 text-[13px] text-[#555] whitespace-nowrap">{s.quantity}개</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-[#111] whitespace-nowrap">{won(s.amount)}</td>
                    <td className="px-5 py-4 text-[12px] text-[#9a9080] whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                    <td className="px-5 py-4 text-[11px] text-[#9a9080] whitespace-nowrap">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
