import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { LiveCoupon } from '../../lib/types'
import { won, formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

type CouponRow = LiveCoupon & { lives: { title: string; partners: { brand_name: string } | null } | null }

export default function AdminCoupons() {
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('live_coupons')
      .select('*, lives(title, partners(brand_name))')
      .order('created_at', { ascending: false })
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setCoupons((data ?? []) as unknown as CouponRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const toggleActive = async (coupon: CouponRow) => {
    setBusyId(coupon.id)
    setError('')
    const { error: err } = await supabase.from('live_coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    setBusyId(null)
    if (err) { setError(`처리 실패: ${err.message}`); return }
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c)))
  }

  const discountLabel = (c: CouponRow) => c.discount_type === 'percent' ? `${c.discount_value}%` : won(c.discount_value)

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">쿠폰 현황</p>
      </header>

      <main className="max-w-[1200px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">쿠폰 현황</h1>
        <p className="text-[13px] text-ink-soft mb-5">라이브 방송별로 발급된 쿠폰 사용 현황을 확인하고, 문제 있는 쿠폰을 비활성화할 수 있습니다.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : coupons.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">발급된 쿠폰이 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">브랜드</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">라이브</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">할인</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">최소구매금액</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">사용/한도</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">발급일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{c.lives?.partners?.brand_name ?? '-'}</td>
                    <td className="px-4 py-3 text-ink max-w-[200px] truncate">{c.lives?.title ?? '-'}</td>
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{discountLabel(c)}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{won(c.min_purchase)}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{c.qty_used} / {c.qty_limit ?? '무제한'}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${c.active ? 'bg-signal-blue/10 text-signal-blue' : 'bg-quiet text-ink-faint'}`}>
                        {c.active ? '사용중' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant={c.active ? 'danger' : 'accent'} size="sm" label={c.active ? '비활성화' : '활성화'}
                        disabled={busyId === c.id} onClick={() => void toggleActive(c)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
