import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyDeptAccount } from '../../lib/deptAccount'
import type { DeptAccount, DeptSaleRow } from '../../lib/types'
import { comma, formatDateTime } from '../../lib/format'
import PeriodFilter from '../../components/common/PeriodFilter'
import { computePeriodRange, inRange, type PeriodKey } from '../../lib/period'
import DeptHeader from '../../components/dept/DeptHeader'

// beautyground-erp(매장관리 시스템)와 같은 톤 — 옅은 라벤더그레이 배경, 흰 rounded-16 카드,
// 네이비(#1a1e36) 강조, 뮤트 라벤더그레이(#8b90ad) 보조텍스트.
const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(20,25,60,.06)',
  padding: 22,
}

interface TrendPoint {
  key: string
  label: string
  value: number
}

// 방송별 판매금액 추이 — 단일 계열이라 범례 없이 네이비 한 색만 사용(dataviz 스킬: sequential 1 hue).
// 막대는 실측 컨테이너 폭을 몰라도 되게 flex 비율로 그린다(반응형), 값은 hover 시 툴팁으로.
function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const ticks = [max, Math.round(max / 2), 0]

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 160, paddingBottom: 20, fontSize: 11, color: '#8b90ad', textAlign: 'right', minWidth: 44 }}>
        {ticks.map((t) => <span key={t}>{comma(t)}</span>)}
      </div>
      <div style={{ position: 'relative', flex: 1, height: 180 }}>
        {/* 가로 그리드라인(0/중간/최대) — hairline, 눈에 띄지 않게 */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 20 }}>
          {[0, 0.5, 1].map((p) => (
            <div key={p} style={{ position: 'absolute', left: 0, right: 0, top: `${(1 - p) * 100}%`, borderTop: '1px solid #eceef5' }} />
          ))}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
          {data.map((d, i) => (
            <div
              key={d.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'default' }}
            >
              <div
                style={{
                  width: '100%', maxWidth: 24,
                  height: `${(d.value / max) * 100}%`,
                  minHeight: d.value > 0 ? 3 : 0,
                  background: hover === i ? '#2b3050' : '#1a1e36',
                  borderRadius: '4px 4px 0 0',
                  transition: 'background .1s',
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {data.map((d) => (
            <div key={d.key} style={{ flex: '1 1 0', textAlign: 'center', fontSize: 10.5, color: '#8b90ad', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </div>
          ))}
        </div>
        {hover !== null && data[hover] && (
          <div
            style={{
              position: 'absolute', top: 0, left: `${((hover + 0.5) / data.length) * 100}%`, transform: 'translate(-50%, -100%)',
              background: '#1a1e36', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            {comma(data[hover].value)}원
          </div>
        )}
      </div>
    </div>
  )
}

export default function DeptSales() {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<DeptAccount | null>(null)
  const [rows, setRows] = useState<DeptSaleRow[]>([])

  const [periodKey, setPeriodKey] = useState<PeriodKey>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      const acc = await getMyDeptAccount()
      if (!active) return
      if (!acc) { setAccount(null); setLoading(false); return }
      setAccount(acc)

      const { data } = await supabase
        .from('dept_live_sales_view')
        .select('*')
        .order('live_scheduled_at', { ascending: false })
      if (!active) return
      setRows((data ?? []) as DeptSaleRow[])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filteredRows = useMemo(() => {
    if (periodKey === 'all') return rows
    const range = computePeriodRange(periodKey, customStart, customEnd)
    return rows.filter((r) => r.live_scheduled_at && inRange(r.live_scheduled_at, range))
  }, [rows, periodKey, customStart, customEnd])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', color: '#8b90ad', fontSize: 14 }}>
        불러오는 중…
      </div>
    )
  }

  if (!account) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', padding: 20 }}>
        <div style={{ ...card, maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1e36', marginBottom: 8 }}>담당자 계정을 찾을 수 없습니다</p>
          <p style={{ fontSize: 13.5, color: '#8b90ad' }}>뷰티그라운드 담당자에게 문의해 주세요.</p>
        </div>
      </div>
    )
  }

  if (account.status === 'suspended') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', padding: 20 }}>
        <div style={{ ...card, maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1e36', marginBottom: 8 }}>이용이 정지된 계정입니다</p>
          <p style={{ fontSize: 13.5, color: '#8b90ad' }}>자세한 내용은 뷰티그라운드로 문의해 주세요.</p>
        </div>
      </div>
    )
  }

  const totalAmount = filteredRows.reduce((sum, r) => sum + r.total_amount, 0)
  const totalQuantity = filteredRows.reduce((sum, r) => sum + r.total_quantity, 0)

  // 차트는 방송일시 오름차순(과거→최근)으로, 표는 최근 방송이 먼저 보이게 유지.
  const trendData: TrendPoint[] = [...filteredRows]
    .sort((a, b) => (a.live_scheduled_at ?? '').localeCompare(b.live_scheduled_at ?? ''))
    .map((r) => ({
      key: r.live_id,
      label: r.live_scheduled_at ? formatDateTime(r.live_scheduled_at).slice(5, 10) : '-',
      value: r.total_amount,
    }))

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f9' }}>
      <DeptHeader account={account} active="sales" />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
        <PeriodFilter
          value={periodKey} customStart={customStart} customEnd={customEnd}
          onChange={setPeriodKey}
          onCustomChange={(s, e) => { setCustomStart(s); setCustomEnd(e) }}
          theme="navy"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={card}>
            <p style={{ fontSize: 13, color: '#8b90ad', marginBottom: 6 }}>판매금액</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1e36', fontVariantNumeric: 'tabular-nums' }}>{comma(totalAmount)}원</p>
          </div>
          <div style={card}>
            <p style={{ fontSize: 13, color: '#8b90ad', marginBottom: 6 }}>판매수량</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1e36', fontVariantNumeric: 'tabular-nums' }}>{comma(totalQuantity)}개</p>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px 22px', color: '#8b90ad', fontSize: 14 }}>
            아직 집계된 판매가 없습니다.
          </div>
        ) : (
          <>
            {trendData.length > 1 && (
              <div style={{ ...card, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1e36', marginBottom: 14 }}>방송별 판매 추이</p>
                <SalesTrendChart data={trendData} />
              </div>
            )}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eceef5' }}>
                      {['방송', '방송일시', '판매수량', '판매금액'].map((col) => (
                        <th key={col} style={{ padding: '14px 18px', color: '#8b90ad', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.live_id} style={{ borderBottom: '1px solid #eceef5' }}>
                        <td style={{ padding: '14px 18px', color: '#1a1e36', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.live_title}</td>
                        <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap' }}>{formatDateTime(r.live_scheduled_at)}</td>
                        <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{comma(r.total_quantity)}개</td>
                        <td style={{ padding: '14px 18px', color: '#1a1e36', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{comma(r.total_amount)}원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
