import { Link, useNavigate } from 'react-router-dom'
import type { Address } from '../../lib/addresses'

const field =
  'w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

interface Props {
  loggedIn: boolean
  addresses: Address[]
  showForm: boolean
  onShowForm: (v: boolean) => void
  name: string
  onName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  address: string
  onSearchAddress: () => void
  addressDetail: string
  onAddressDetail: (v: string) => void
  saving: boolean
  error: string
  onAdd: (e: React.FormEvent) => void
  onSetDefault: (id: string) => void
  onDelete: (id: string) => void
}

// PC 버전 — 설정류 페이지답게 560px 중앙 정렬 폭 유지, 구조는 모바일과 동일.
export default function DesktopAddresses({
  loggedIn,
  addresses,
  showForm,
  onShowForm,
  name,
  onName,
  phone,
  onPhone,
  address,
  onSearchAddress,
  addressDetail,
  onAddressDetail,
  saving,
  error,
  onAdd,
  onSetDefault,
  onDelete,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-paper min-h-screen">
      <header className="bg-paper border-b border-rule sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center">
          <Link to="/app/home" className="text-[19px] font-bold text-ink tracking-[-0.01em]">
            뷰티그라운드
          </Link>
          <h1 className="ml-6 text-[15px] font-bold text-ink-soft">배송지 관리</h1>
        </div>
      </header>

      <div className="max-w-[560px] mx-auto px-6 py-10">
        {!loggedIn ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
            <button
              onClick={() => navigate('/app/login', { state: { from: '/app/addresses' } })}
              className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
            >
              로그인하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => (
              <div key={a.id} className="bg-paper p-4 border border-rule">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-ink">{a.recipient_name}</p>
                    {a.is_default && (
                      <span className="text-[11px] font-bold text-ink border border-ink rounded-control px-2 py-0.5">기본배송지</span>
                    )}
                  </div>
                  <button onClick={() => onDelete(a.id)} className="text-ink-faint text-[13px] focus:outline-none focus-visible:shadow-ring" aria-label="배송지 삭제">
                    삭제
                  </button>
                </div>
                <p className="text-[13px] text-ink-soft mt-1">{a.phone}</p>
                <p className="text-[13px] text-ink-soft mt-0.5">{a.address}</p>
                {!a.is_default && (
                  <button
                    onClick={() => onSetDefault(a.id)}
                    className="mt-2 text-[12px] text-ink-soft focus:outline-none focus-visible:shadow-ring"
                  >
                    기본 배송지로 설정
                  </button>
                )}
              </div>
            ))}

            {showForm ? (
              <form onSubmit={onAdd} className="bg-paper p-4 border border-rule space-y-3">
                <h2 className="text-[14px] font-bold text-ink">새 배송지</h2>
                <input value={name} onChange={(e) => onName(e.target.value)} placeholder="받는 분 성함" className={field} />
                <input value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="연락처 (010-0000-0000)" className={field} />
                <div className="flex gap-2">
                  <input
                    value={address}
                    readOnly
                    onClick={onSearchAddress}
                    placeholder="주소 검색을 눌러주세요"
                    className={`${field} cursor-pointer`}
                  />
                  <button
                    type="button"
                    onClick={onSearchAddress}
                    className="shrink-0 rounded-control border border-rule text-ink font-bold text-[13px] px-4 focus:outline-none focus-visible:shadow-ring"
                  >
                    주소 검색
                  </button>
                </div>
                {address && (
                  <input
                    value={addressDetail}
                    onChange={(e) => onAddressDetail(e.target.value)}
                    placeholder="상세 주소 (동/호수 등)"
                    className={field}
                  />
                )}
                {error && <p className="text-[13px] text-signal-red">{error}</p>}
                <div className="flex gap-2">
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => onShowForm(false)} className="flex-1 rounded-control border border-rule text-ink-soft font-bold text-[14px] py-3 focus:outline-none focus-visible:shadow-ring">
                      취소
                    </button>
                  )}
                  <button type="submit" disabled={saving} className="flex-1 rounded-control bg-ink text-paper font-bold text-[14px] py-3 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring">
                    {saving ? '저장 중…' : '저장'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => onShowForm(true)}
                className="w-full border border-dashed border-rule text-ink-soft font-bold text-[14px] py-4 focus:outline-none focus-visible:shadow-ring"
              >
                + 새 배송지 추가
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
