import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import DesktopAddresses from '../components/address/DesktopAddresses'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'
import { getAddresses, addAddress, setDefaultAddress, deleteAddress, type Address } from '../lib/addresses'
import { searchAddress } from '../lib/daumPostcode'

const field =
  'w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

export default function AppAddresses() {
  const navigate = useNavigate()
  const { mode, isDesktop, toggle } = useViewMode()
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSearchAddress = async () => {
    const result = await searchAddress().catch(() => null)
    if (result) setAddress(result.address)
  }

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoggedIn(false); setLoading(false); return }
    const list = await getAddresses()
    setAddresses(list)
    setShowForm(list.length === 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('받는 분·연락처·주소를 모두 입력해 주세요.')
      return
    }
    setSaving(true)
    const fullAddress = [address, addressDetail].map((s) => s.trim()).filter(Boolean).join(' ')
    const { error: err } = await addAddress({ recipientName: name.trim(), phone: phone.trim(), address: fullAddress })
    setSaving(false)
    if (err) { setError('배송지 저장에 실패했습니다.'); return }
    setName(''); setPhone(''); setAddress(''); setAddressDetail(''); setShowForm(false)
    await load()
  }

  const handleSetDefault = async (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))
    await setDefaultAddress(id)
  }

  const handleDelete = async (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    await deleteAddress(id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule flex items-center justify-center text-ink-faint text-[14px]">불러오는 중...</div>
      </div>
    )
  }

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopAddresses
          loggedIn={loggedIn}
          addresses={addresses}
          showForm={showForm}
          onShowForm={setShowForm}
          name={name}
          onName={setName}
          phone={phone}
          onPhone={setPhone}
          address={address}
          onSearchAddress={handleSearchAddress}
          addressDetail={addressDetail}
          onAddressDetail={setAddressDetail}
          saving={saving}
          error={error}
          onAdd={handleAdd}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
        />
      </>
    )
  }

  if (!loggedIn) {
    return (
      <AppFrame>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <BackHeader title="배송지 관리" />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
          <button
            onClick={() => navigate('/app/login', { state: { from: '/app/addresses' } })}
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
      <BackHeader title="배송지 관리" />

      <div className="px-4 pt-4 space-y-3">
        {addresses.map((a) => (
          <div key={a.id} className="bg-paper p-4 border border-rule">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-bold text-ink">{a.recipient_name}</p>
                {a.is_default && (
                  <span className="text-[11px] font-bold text-ink border border-ink rounded-control px-2 py-0.5">기본배송지</span>
                )}
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-ink-faint text-[13px] focus:outline-none focus-visible:shadow-ring" aria-label="배송지 삭제">
                삭제
              </button>
            </div>
            <p className="text-[13px] text-ink-soft mt-1">{a.phone}</p>
            <p className="text-[13px] text-ink-soft mt-0.5">{a.address}</p>
            {!a.is_default && (
              <button
                onClick={() => handleSetDefault(a.id)}
                className="mt-2 text-[12px] text-ink-soft focus:outline-none focus-visible:shadow-ring"
              >
                기본 배송지로 설정
              </button>
            )}
          </div>
        ))}

        {showForm ? (
          <form onSubmit={handleAdd} className="bg-paper p-4 border border-rule space-y-3">
            <h2 className="text-[14px] font-bold text-ink">새 배송지</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="받는 분 성함" className={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 (010-0000-0000)" className={field} />
            <div className="flex gap-2">
              <input
                value={address}
                readOnly
                onClick={handleSearchAddress}
                placeholder="주소 검색을 눌러주세요"
                className={`${field} cursor-pointer`}
              />
              <button
                type="button"
                onClick={handleSearchAddress}
                className="shrink-0 rounded-control border border-rule text-ink font-bold text-[13px] px-4 focus:outline-none focus-visible:shadow-ring"
              >
                주소 검색
              </button>
            </div>
            {address && (
              <input
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세 주소 (동/호수 등)"
                className={field}
              />
            )}
            {error && <p className="text-[13px] text-signal-red">{error}</p>}
            <div className="flex gap-2">
              {addresses.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-control border border-rule text-ink-soft font-bold text-[14px] py-3 focus:outline-none focus-visible:shadow-ring">
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
            onClick={() => setShowForm(true)}
            className="w-full border border-dashed border-rule text-ink-soft font-bold text-[14px] py-4 focus:outline-none focus-visible:shadow-ring"
          >
            + 새 배송지 추가
          </button>
        )}
      </div>
    </AppFrame>
  )
}
