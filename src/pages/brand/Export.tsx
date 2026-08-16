import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  getMyBrandAccess,
  updateMyExportDetails,
  setMyProductExportFeatured,
  updateMyProductExportContent,
  updateMyExportLogo,
  uploadExportImage,
  translateText,
} from '../../lib/partner'
import type { Partner, Product } from '../../lib/types'

// 수출 브랜드 페이지 편집기 (v2, 2026-08-17 재구축 — 리틀리 벤치마킹 후 확정한 틀)
// 좌측 = 고정 슬롯 아코디언(기본 정보 입력) / 우측 = 바이어에게 보이는 폰 화면 실시간 미리보기.
// 저장 로직·RPC는 기존 검증된 것을 그대로 사용한다. 영문 소개를 저장하는 순간
// 공개 미니페이지(/x/브랜드명)가 자동으로 열린다 — "틀만 제공, 가입해야 개설" 원칙.

const CERTIFICATION_OPTIONS = ['CPNP(EU)', 'FDA(US)', '비건', '할랄', '유기농', 'ISO22716', '동물실험 안전']
const MAX_FEATURED = 5
const MAX_PRODUCT_IMAGES = 9

type ProductRow = Pick<
  Product,
  'id' | 'name' | 'thumbnail_url' | 'is_export_featured' | 'export_image_urls' | 'export_description' | 'export_description_en'
>

interface ProductDraft {
  images: string[]
  description: string
  descriptionEn: string
  uploading: boolean
  translating: boolean
  saving: boolean
  saved: boolean
  error: string
}

function draftFrom(p: ProductRow): ProductDraft {
  return {
    images: p.export_image_urls ?? [],
    description: p.export_description ?? '',
    descriptionEn: p.export_description_en ?? '',
    uploading: false,
    translating: false,
    saving: false,
    saved: false,
    error: '',
  }
}

// ── 좌측 슬롯 아코디언 셸 ──
function Slot({
  num, title, sub, chip, chipTone, open, onToggle, children,
}: {
  num: number; title: string; sub: string; chip: string; chipTone: 'ok' | 'warn'
  open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-2xl border mb-2.5 overflow-hidden transition-colors ${open ? 'border-[#C9A96E] shadow-[0_4px_18px_rgba(176,138,79,0.10)]' : 'border-[#E8E6E1]'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4.5 py-4 px-5 text-left">
        <span className={`w-[26px] h-[26px] rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0 ${open ? 'bg-[#B08A4F]' : 'bg-[#1B2537]'}`}>{num}</span>
        <span className="flex-1">
          <span className="block text-[14px] font-bold text-[#23272F]">{title}</span>
          <span className="block text-[11px] text-[#6B7280] mt-0.5">{sub}</span>
        </span>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${chipTone === 'ok' ? 'bg-[#E8F3EC] text-[#2E7D4F]' : 'bg-[#FDEEE4] text-[#C2410C]'}`}>{chip}</span>
        <span className={`text-[10px] text-[#B9B5AD] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-dashed border-[#E8E6E1]">{children}</div>}
    </div>
  )
}

export default function BrandExport() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [pitch, setPitch] = useState('')
  const [pitchEn, setPitchEn] = useState('')
  const [translatingPitch, setTranslatingPitch] = useState(false)
  const [certifications, setCertifications] = useState<string[]>([])
  const [addingCert, setAddingCert] = useState(false)
  const [customCertInput, setCustomCertInput] = useState('')
  const [countries, setCountries] = useState('')
  const [moqNotes, setMoqNotes] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [featureError, setFeatureError] = useState('')
  const [openSlot, setOpenSlot] = useState(1)
  const [copied, setCopied] = useState(false)
  const [translateNote, setTranslateNote] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { partner: p } = await getMyBrandAccess()
      if (!active) return
      setPartner(p)
      if (p) {
        setPitch(p.export_pitch ?? '')
        setPitchEn(p.export_pitch_en ?? '')
        setCertifications(p.export_certifications ?? [])
        setCountries(p.export_countries ?? '')
        setMoqNotes(p.export_moq_notes ?? '')
        const { data } = await supabase
          .from('products')
          .select('id,name,thumbnail_url,is_export_featured,export_image_urls,export_description,export_description_en')
          .eq('partner_id', p.id)
          .eq('status', 'on_sale')
          .order('name')
        if (active) {
          const rows = (data ?? []) as ProductRow[]
          setProducts(rows)
          setDrafts(Object.fromEntries(rows.filter((r) => r.is_export_featured).map((r) => [r.id, draftFrom(r)])))
        }
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const featuredCount = products.filter((p) => p.is_export_featured).length
  const featuredProducts = products.filter((p) => p.is_export_featured)

  // ── 완성도 계산 — 게이지와 슬롯 칩이 여기서 나온다 ──
  const completion = useMemo(() => {
    let score = 0
    if (partner?.export_logo_url) score += 15
    if (pitchEn.trim()) score += 25
    if (certifications.length > 0) score += 10
    if (countries.trim()) score += 5
    if (moqNotes.trim()) score += 10
    if (featuredCount > 0) score += 20
    const imgTotal = featuredProducts.reduce((n, p) => n + (drafts[p.id]?.images.length ?? p.export_image_urls?.length ?? 0), 0)
    if (imgTotal >= 3) score += 15
    return score
  }, [partner, pitchEn, certifications, countries, moqNotes, featuredCount, featuredProducts, drafts])

  const nextHint = !pitchEn.trim()
    ? '영문 소개를 저장하면 내 수출 페이지가 열립니다'
    : featuredCount === 0
      ? '대표상품을 선택하면 바이어에게 제품이 보입니다'
      : !partner?.export_logo_url
        ? '로고를 올리면 페이지 완성도가 올라갑니다'
        : certifications.length === 0
          ? '보유 인증을 추가하면 바이어 신뢰도가 올라갑니다'
          : '훌륭합니다! 내용을 계속 업데이트해 주세요'

  const toggleCert = (cert: string) => {
    setCertifications((prev) => (prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]))
  }
  const addCustomCert = () => {
    const v = customCertInput.trim()
    if (v && !certifications.includes(v)) setCertifications((prev) => [...prev, v])
    setCustomCertInput('')
    setAddingCert(false)
  }

  const toggleFeatured = async (product: ProductRow) => {
    setFeatureError('')
    if (!product.is_export_featured && featuredCount >= MAX_FEATURED) {
      setFeatureError(`대표상품은 최대 ${MAX_FEATURED}개까지 선택할 수 있습니다.`)
      return
    }
    const next = !product.is_export_featured
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_export_featured: next } : p)))
    if (next) setDrafts((prev) => (prev[product.id] ? prev : { ...prev, [product.id]: draftFrom(product) }))
    try {
      await setMyProductExportFeatured(product.id, next)
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_export_featured: !next } : p)))
      setFeatureError('저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  const patchDraft = (productId: string, patch: Partial<ProductDraft>) => {
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }))
  }

  const handleLogoUpload = async (file: File) => {
    if (!partner) return
    setLogoUploading(true)
    setError('')
    try {
      const url = await uploadExportImage(file, partner.id, 'logo')
      const updated = await updateMyExportLogo(url)
      setPartner(updated)
    } catch {
      setError('로고 업로드에 실패했습니다.')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleAddProductImages = async (product: ProductRow, files: FileList) => {
    if (!partner) return
    const draft = drafts[product.id] ?? draftFrom(product)
    const remaining = MAX_PRODUCT_IMAGES - draft.images.length
    if (remaining <= 0) {
      patchDraft(product.id, { error: `이미지는 최대 ${MAX_PRODUCT_IMAGES}장까지 등록할 수 있습니다.` })
      return
    }
    patchDraft(product.id, { uploading: true, error: '' })
    try {
      const toUpload = Array.from(files).slice(0, remaining)
      const urls = await Promise.all(toUpload.map((f) => uploadExportImage(f, partner.id, product.id)))
      setDrafts((prev) => ({
        ...prev,
        [product.id]: { ...prev[product.id], images: [...prev[product.id].images, ...urls], uploading: false },
      }))
    } catch {
      patchDraft(product.id, { uploading: false, error: '이미지 업로드에 실패했습니다.' })
    }
  }

  const removeProductImage = (productId: string, url: string) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], images: prev[productId].images.filter((u) => u !== url) },
    }))
  }

  const handleTranslate = async (productId: string) => {
    const draft = drafts[productId]
    if (!draft?.description.trim()) return
    patchDraft(productId, { translating: true, error: '' })
    try {
      const translated = await translateText(draft.description.trim())
      patchDraft(productId, { descriptionEn: translated, translating: false })
    } catch {
      patchDraft(productId, { translating: false, error: '번역에 실패했습니다.' })
    }
  }

  const handleSaveProduct = async (productId: string) => {
    const draft = drafts[productId]
    if (!draft) return
    patchDraft(productId, { saving: true, error: '', saved: false })
    try {
      await updateMyProductExportContent(productId, draft.images, draft.description.trim(), draft.descriptionEn.trim())
      patchDraft(productId, { saving: false, saved: true })
      setTimeout(() => patchDraft(productId, { saved: false }), 2500)
    } catch {
      patchDraft(productId, { saving: false, error: '저장에 실패했습니다.' })
    }
  }

  const handleTranslatePitch = async () => {
    if (!pitch.trim()) return
    setTranslatingPitch(true)
    setError('')
    try {
      const translated = await translateText(pitch.trim())
      setPitchEn(translated)
    } catch {
      setError('번역에 실패했습니다.')
    } finally {
      setTranslatingPitch(false)
    }
  }

  const handleSaveDetails = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    // 이번 저장으로 페이지가 "처음 개설"되는지(빈 영문 소개 → 채움) — 개설 웰컴 메일 1회 발송 트리거
    const firstOpen = !(partner?.export_pitch_en?.trim() ?? '') && pitchEn.trim().length > 0
    try {
      const updated = await updateMyExportDetails({
        pitch: pitch.trim(),
        pitchEn: pitchEn.trim(),
        certifications,
        countries: countries.trim(),
        moqNotes: moqNotes.trim(),
      })
      setPartner((prev) => (prev ? { ...prev, ...updated } : updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (firstOpen && token) {
        // 개설 웰컴 메일 — 실패해도 저장 흐름은 막지 않는다
        void fetch('/api/export-brand?action=welcome', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      }
      // 다국어 자동 번역 — 한글(또는 영문) 소개가 있으면 9개 언어 번역을 만들어 저장 (바이어 언어 버튼용)
      if (token && (pitch.trim() || pitchEn.trim())) {
        setTranslateNote('🌐 바이어용 9개 언어 번역 생성 중… (수 분 내 자동 반영)')
        fetch('/api/export-brand?action=translate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
          .then(async (r) => {
            if (r.ok) {
              const d = await r.json()
              setTranslateNote(`🌐 번역 완료 — 소개${d.pitch ? ' ✓' : ' ✗'} · 상품 ${d.products}개`)
            } else if (r.status === 503) {
              setTranslateNote('') // 번역 컬럼 미설정(관리자 SQL 실행 전) — 조용히 넘어감
            } else {
              setTranslateNote('🌐 번역 생성 실패 — 다음 저장 때 다시 시도됩니다')
            }
            setTimeout(() => setTranslateNote(''), 8000)
          })
          .catch(() => setTranslateNote(''))
      }
    } catch {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[14px] text-[#9a9080]">불러오는 중...</p>
      </div>
    )
  }
  if (!partner) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-[14px] border border-[#e5e0d8] p-10 text-center">
        <p className="text-[16px] font-semibold text-[#111] mb-2">브랜드 계정을 찾을 수 없습니다</p>
        <p className="text-[14px] text-[#9a9080]">뷰티그라운드 담당자에게 문의해 주세요.</p>
      </div>
    )
  }

  const pageUrl = `beautyground.co.kr/x/${partner.brand_name}`
  const pageOpen = (partner.export_pitch_en?.trim() ?? '').length > 0
  const previewProducts = featuredProducts.slice(0, 6)

  const copyUrl = () => {
    void navigator.clipboard.writeText(`https://${pageUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-[#E8E6E1] rounded-[10px] text-[13.5px] text-[#23272F] placeholder:text-[#c4bcae] bg-[#FBFAF8] focus:outline-none focus:border-[#B08A4F] transition-colors'

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
      {/* ══════ 좌: 기본 정보 입력 (고정 슬롯) ══════ */}
      <div>
        {/* 완성도 게이지 */}
        <div className="bg-white rounded-2xl border border-[#E8E6E1] px-5 py-4 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[15px] font-bold text-[#1B2537]">수출 페이지 완성도</p>
            <span className="text-[13px] font-bold text-[#B08A4F]">{completion}%</span>
          </div>
          <div className="h-2 bg-[#EFEDE8] rounded-full overflow-hidden">
            <i className="block h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#B08A4F] transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          <p className="text-[12px] text-[#6B7280] mt-2">💡 {nextHint}</p>
        </div>

        {/* 슬롯 1 — 브랜드 헤더 */}
        <Slot
          num={1} title="브랜드 헤더" sub="로고 · 브랜드 소개 (영문 소개 저장 시 페이지 개설)"
          chip={pitchEn.trim() ? '완료' : '필수'} chipTone={pitchEn.trim() ? 'ok' : 'warn'}
          open={openSlot === 1} onToggle={() => setOpenSlot(openSlot === 1 ? 0 : 1)}
        >
          <div className="flex items-center gap-4 mt-4 mb-4">
            <div className="w-16 h-16 rounded-full border border-[#E8E6E1] bg-[#FBFAF8] flex items-center justify-center overflow-hidden shrink-0">
              {partner.export_logo_url ? (
                <img src={partner.export_logo_url} alt="로고" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[#c4bcae]">로고</span>
              )}
            </div>
            <label className="cursor-pointer">
              <span className="inline-block bg-[#F8F3EA] border border-[#E2D3B4] rounded-[10px] px-4 py-2 text-[12.5px] font-bold text-[#8B6F3D]">
                {logoUploading ? '업로드 중…' : partner.export_logo_url ? '로고 변경' : '로고 업로드'}
              </span>
              <input type="file" accept="image/*" className="hidden" disabled={logoUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); e.target.value = '' }} />
            </label>
          </div>
          <p className="text-[12px] font-bold text-[#1B2537] mb-1.5">브랜드 소개 (한글)</p>
          <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={4}
            placeholder="예: OO은 2020년 설립된 스킨케어 브랜드로, 핵심 성분과 대표 제품, 국내 실적을 담아 소개해 주세요."
            className={`${inputCls} resize-none mb-3`} />
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-bold text-[#1B2537]">영문 소개 <span className="text-[#C2410C]">*</span> <span className="font-normal text-[#6B7280]">— 바이어에게 표시</span></p>
            <button type="button" onClick={() => void handleTranslatePitch()} disabled={translatingPitch || !pitch.trim()}
              className="text-[12px] text-[#B08A4F] font-bold hover:underline disabled:opacity-40 disabled:no-underline">
              {translatingPitch ? '번역 중…' : '한글 소개 번역하기 →'}
            </button>
          </div>
          <textarea value={pitchEn} onChange={(e) => setPitchEn(e.target.value)} rows={4}
            placeholder="번역하기를 누르면 자동으로 채워집니다. 이 내용을 저장하는 순간 내 수출 페이지가 열립니다."
            className={`${inputCls} resize-none`} />
        </Slot>

        {/* 슬롯 2 — 인증·수출 정보 */}
        <Slot
          num={2} title="인증 · 수출 정보" sub="보유 인증 · 수출 중인 국가 · MOQ/샘플 정책"
          chip={certifications.length > 0 || moqNotes.trim() ? '완료' : '비어있음'} chipTone={certifications.length > 0 || moqNotes.trim() ? 'ok' : 'warn'}
          open={openSlot === 2} onToggle={() => setOpenSlot(openSlot === 2 ? 0 : 2)}
        >
          <p className="text-[12px] font-bold text-[#1B2537] mt-4 mb-2">보유 인증 <span className="font-normal text-[#6B7280]">— 있는 것만, 바이어 신뢰의 핵심</span></p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CERTIFICATION_OPTIONS.map((cert) => {
              const active = certifications.includes(cert)
              return (
                <button key={cert} type="button" onClick={() => toggleCert(cert)}
                  className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${active ? 'bg-[#1B2537] text-white border-[#1B2537]' : 'bg-white text-[#6B7280] border-[#E8E6E1] hover:border-[#B08A4F]'}`}>
                  {cert}
                </button>
              )
            })}
            {certifications.filter((c) => !CERTIFICATION_OPTIONS.includes(c)).map((cert) => (
              <button key={cert} type="button" onClick={() => toggleCert(cert)} title="클릭하면 삭제됩니다"
                className="px-3 py-1.5 rounded-full text-[12px] border bg-[#1B2537] text-white border-[#1B2537] flex items-center gap-1">
                {cert}<span aria-hidden>×</span>
              </button>
            ))}
            {addingCert ? (
              <span className="flex items-center gap-1.5">
                <input autoFocus value={customCertInput} onChange={(e) => setCustomCertInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCustomCert() }
                    if (e.key === 'Escape') { setAddingCert(false); setCustomCertInput('') }
                  }}
                  placeholder="예: GMP" className="px-3 py-1.5 border border-[#B08A4F] rounded-full text-[12px] focus:outline-none w-[120px]" />
                <button type="button" onClick={addCustomCert} className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#B08A4F] text-white">추가</button>
              </span>
            ) : (
              <button type="button" onClick={() => setAddingCert(true)}
                className="px-3 py-1.5 rounded-full text-[12px] border border-dashed border-[#c4bcae] text-[#9a9080] hover:border-[#B08A4F] hover:text-[#B08A4F]">
                + 추가
              </button>
            )}
          </div>
          <p className="text-[12px] font-bold text-[#1B2537] mb-1.5">이미 수출 중인 국가 <span className="font-normal text-[#6B7280]">(있다면)</span></p>
          <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="예: Japan, Vietnam" className={`${inputCls} mb-3`} />
          <p className="text-[12px] font-bold text-[#1B2537] mb-1.5">MOQ · 샘플 정책</p>
          <textarea value={moqNotes} onChange={(e) => setMoqNotes(e.target.value)} rows={2}
            placeholder="예: 100 pcs / SKU, 샘플 제공 가능(수량 협의)" className={`${inputCls} resize-none`} />
        </Slot>

        {/* 슬롯 3 — 대표상품 선택 */}
        <Slot
          num={3} title="수출 대표상품" sub={`바이어에게 먼저 보여줄 상품 — 최대 ${MAX_FEATURED}개`}
          chip={featuredCount > 0 ? `${featuredCount}개 선택` : '비어있음'} chipTone={featuredCount > 0 ? 'ok' : 'warn'}
          open={openSlot === 3} onToggle={() => setOpenSlot(openSlot === 3 ? 0 : 3)}
        >
          {featureError && <p className="text-[12.5px] text-red-600 mt-3">{featureError}</p>}
          {products.length === 0 ? (
            <p className="text-[13px] text-[#9a9080] py-6 text-center">판매중인 상품이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-4">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => void toggleFeatured(product)}
                  className={`text-left rounded-[10px] border-2 overflow-hidden transition-colors ${product.is_export_featured ? 'border-[#B08A4F]' : 'border-transparent hover:border-[#E8E6E1]'}`}>
                  <div className="relative">
                    <img src={product.thumbnail_url ?? ''} alt={product.name} className="w-full aspect-square object-cover bg-[#f7f4ef]" loading="lazy" />
                    {product.is_export_featured && (
                      <span className="absolute top-1.5 right-1.5 bg-[#B08A4F] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">✓</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#23272F] mt-1 px-0.5 truncate">{product.name}</p>
                </button>
              ))}
            </div>
          )}
        </Slot>

        {/* 슬롯 4 — 상품별 수출 사진·설명 */}
        <Slot
          num={4} title="상품 사진 · 설명" sub="대표상품별 수출용 사진(최대 9장)과 설명"
          chip={featuredProducts.length > 0 ? `${featuredProducts.reduce((n, p) => n + (drafts[p.id]?.images.length ?? 0), 0)}장 등록` : '대표상품 먼저'}
          chipTone={featuredProducts.some((p) => (drafts[p.id]?.images.length ?? 0) > 0) ? 'ok' : 'warn'}
          open={openSlot === 4} onToggle={() => setOpenSlot(openSlot === 4 ? 0 : 4)}
        >
          {featuredProducts.length === 0 ? (
            <p className="text-[13px] text-[#9a9080] py-6 text-center">3번에서 대표상품을 먼저 선택해 주세요.</p>
          ) : (
            featuredProducts.map((product) => {
              const draft = drafts[product.id] ?? draftFrom(product)
              return (
                <div key={product.id} className="mt-4 pb-4 border-b border-dashed border-[#E8E6E1] last:border-b-0">
                  <p className="text-[13px] font-bold text-[#23272F] mb-2">{product.name}</p>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {draft.images.map((url) => (
                      <div key={url} className="relative">
                        <img src={url} alt="" className="w-full aspect-square object-cover rounded-[8px] border border-[#E8E6E1]" />
                        <button type="button" onClick={() => removeProductImage(product.id, url)}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4.5 h-4.5 w-5 h-5 flex items-center justify-center text-[10px]" aria-label="삭제">✕</button>
                      </div>
                    ))}
                    {draft.images.length < MAX_PRODUCT_IMAGES && (
                      <label className="aspect-square rounded-[8px] border-1.5 border border-dashed border-[#C9A96E] bg-[#F8F3EA] flex items-center justify-center cursor-pointer">
                        <span className="text-[13px] text-[#B08A4F] font-bold">{draft.uploading ? '…' : '＋'}</span>
                        <input type="file" accept="image/*" multiple className="hidden" disabled={draft.uploading}
                          onChange={(e) => { if (e.target.files?.length) void handleAddProductImages(product, e.target.files); e.target.value = '' }} />
                      </label>
                    )}
                  </div>
                  <textarea value={draft.description} onChange={(e) => patchDraft(product.id, { description: e.target.value })} rows={2}
                    placeholder="상품 특징·성분·사용법 (한글)" className={`${inputCls} resize-none mb-2`} />
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11.5px] text-[#6B7280]">영문 설명</p>
                    <button type="button" onClick={() => void handleTranslate(product.id)} disabled={draft.translating || !draft.description.trim()}
                      className="text-[11.5px] text-[#B08A4F] font-bold hover:underline disabled:opacity-40 disabled:no-underline">
                      {draft.translating ? '번역 중…' : '번역하기 →'}
                    </button>
                  </div>
                  <textarea value={draft.descriptionEn} onChange={(e) => patchDraft(product.id, { descriptionEn: e.target.value })} rows={2}
                    placeholder="번역하기를 누르면 자동으로 채워집니다." className={`${inputCls} resize-none mb-2`} />
                  {draft.error && <p className="text-[12px] text-red-600 mb-1.5">{draft.error}</p>}
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => void handleSaveProduct(product.id)} disabled={draft.saving}
                      className="bg-[#1B2537] text-white rounded-[9px] px-4 py-2 text-[12px] font-bold disabled:opacity-50">
                      {draft.saving ? '저장 중…' : '이 상품 저장'}
                    </button>
                    {draft.saved && <span className="text-[12px] text-[#B08A4F] font-bold">저장되었습니다 ✓</span>}
                  </div>
                </div>
              )
            })
          )}
        </Slot>

        {/* 안내 + 브랜드 정보 저장 */}
        <div className="bg-gradient-to-br from-[#FBF8F2] to-[#F6F0E4] border border-[#E9DCC3] rounded-2xl px-5 py-3.5 mb-3 flex gap-3 items-start">
          <span className="text-[16px]">🔒</span>
          <p className="text-[11.5px] text-[#9A8768] leading-relaxed">
            바이어 발굴·컨택·협상은 뷰티그라운드 수출팀이 전담하며, 바이어 정보는 브랜드사에 공개되지 않습니다.
            페이지의 실적 영역(PROVEN IN KOREA)은 뷰티그라운드가 실데이터로 자동 관리합니다.
          </p>
        </div>
        {error && <p className="text-[13px] text-red-600 mb-2">{error}</p>}
        {translateNote && <p className="text-[12.5px] text-[#8B6F3D] bg-[#F8F3EA] border border-[#E9DCC3] rounded-lg px-3 py-2 mb-2">{translateNote}</p>}
        <div className="sticky bottom-4 flex items-center gap-3">
          <button onClick={() => void handleSaveDetails()} disabled={saving}
            className="flex-1 bg-[#1B2537] text-white rounded-xl py-3.5 text-[14px] font-bold shadow-lg hover:opacity-95 disabled:opacity-50">
            {saving ? '저장 중…' : '브랜드 정보 저장'}
          </button>
          {saved && <span className="text-[13px] text-[#B08A4F] font-bold whitespace-nowrap">저장 완료 ✓</span>}
        </div>
      </div>

      {/* ══════ 우: 폰 미리보기 (실시간) ══════ */}
      <div className="lg:sticky lg:top-6 order-first lg:order-none">
        <p className="text-[12px] text-[#6B7280] text-center mb-3">바이어에게 보이는 화면 — <b className="text-[#B08A4F]">실시간 미리보기</b></p>
        <div className="mx-auto w-full max-w-[375px] rounded-[38px] overflow-hidden shadow-[0_24px_60px_rgba(27,37,55,0.22),0_0_0_10px_#1C1E22,0_0_0_12px_#3A3D44]">
          <div className="h-[560px] overflow-y-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* 히어로 */}
            <div className="relative bg-gradient-to-br from-[#20293C] via-[#1B2537] to-[#2A3550] text-white text-center px-5 pt-10 pb-5">
              <span className="absolute top-3 right-3 text-[9px] font-bold text-white/70 bg-white/10 border border-white/20 rounded-full px-2.5 py-1">🌐 English ▾</span>
              {partner.export_logo_url ? (
                <img src={partner.export_logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white mx-auto mb-2.5 border-2 border-white/20" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white text-[#1B2537] font-serif text-[18px] font-bold flex items-center justify-center mx-auto mb-2.5">
                  {partner.brand_name.charAt(0)}
                </div>
              )}
              <p className="font-serif text-[18px] tracking-wider">{partner.brand_name}</p>
              {pitchEn.trim() ? (
                <p className="text-[11px] text-[#C8CEDB] mt-1.5 leading-relaxed">{pitchEn}</p>
              ) : (
                <p className="text-[10.5px] text-[#7E8797] mt-1.5 italic">⚠️ 영문 소개가 들어갈 자리입니다 — 저장하면 페이지가 열립니다</p>
              )}
              {(countries.trim() || moqNotes.trim()) && (
                <div className="flex gap-1.5 justify-center flex-wrap mt-3">
                  {countries.trim() && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40">Exporting: {countries}</span>}
                  {moqNotes.trim() && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40">MOQ: {moqNotes.length > 22 ? moqNotes.slice(0, 22) + '…' : moqNotes}</span>}
                </div>
              )}
            </div>
            {/* PROVEN */}
            <div className="bg-[#141B2B] px-3.5 pt-3 pb-3.5">
              <p className="text-[8.5px] font-black tracking-[0.2em] text-[#C9A96E] text-center mb-2">✦ PROVEN IN KOREA — BY BEAUTYGROUND</p>
              <div className="flex gap-1.5">
                {[['Dept. Store', 'On display in Korea'], [`${featuredCount || products.length} Products`, 'On Beautyground mall'], ['Direct', 'Buy & resell']].map(([v, k]) => (
                  <div key={k} className="flex-1 bg-white/[0.055] border border-[#C9A96E]/25 rounded-lg px-1 py-2 text-center">
                    <p className="text-[11px] font-black text-white">{v}</p>
                    <p className="text-[7.5px] text-[#9AA3B5] mt-0.5">{k}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* 제품 */}
            <div className="px-3.5 pt-4">
              <p className="text-[10px] font-black tracking-[0.16em] text-[#B08A4F] mb-2.5">PRODUCTS</p>
              {previewProducts.length === 0 ? (
                <div className="border border-dashed border-[#C9A96E] bg-[#F8F3EA] rounded-xl py-6 text-center text-[10.5px] text-[#B08A4F] mb-3">
                  ⚠️ 대표상품이 들어갈 자리입니다 — 3번에서 선택해 주세요
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {previewProducts.map((p) => {
                    const img = drafts[p.id]?.images[0] ?? p.export_image_urls?.[0] ?? p.thumbnail_url ?? ''
                    return (
                      <div key={p.id} className="min-w-[110px] w-[110px] bg-white border border-[#E8E6E1] rounded-xl overflow-hidden shrink-0">
                        <img src={img} alt="" className="w-full aspect-square object-cover" />
                        <div className="px-2 py-1.5">
                          <p className="text-[9.5px] font-bold leading-tight line-clamp-2">{p.name}</p>
                          <p className="text-[8.5px] text-[#B08A4F] font-bold mt-1">Wholesale on request</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* 인증 */}
            {certifications.length > 0 && (
              <div className="px-3.5 pt-1 pb-2">
                <p className="text-[10px] font-black tracking-[0.16em] text-[#B08A4F] mb-2">CERTIFICATIONS</p>
                <div className="flex gap-1 flex-wrap">
                  {certifications.map((c) => (
                    <span key={c} className="text-[9px] font-bold text-[#1B2537] bg-white border border-[#E8E6E1] px-2 py-1 rounded-md">✓ {c}</span>
                  ))}
                </div>
              </div>
            )}
            {/* 듀얼 CTA */}
            <div className="px-3.5 py-3">
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-xl py-2 bg-[#1B2537] text-white text-center">
                  <p className="text-[10.5px] font-black">🛒 Shop This Brand</p>
                  <p className="text-[7.5px] text-[#C9A96E]">Beautyground mall</p>
                </div>
                <div className="flex-1 rounded-xl py-2 bg-[#22C15E] text-white text-center">
                  <p className="text-[10.5px] font-black">💬 Wholesale</p>
                  <p className="text-[7.5px] opacity-80">Reply within 24h</p>
                </div>
              </div>
              <p className="text-center text-[7.5px] text-[#9A9488] mt-1.5">Retail & export both handled by BEAUTYGROUND, Seoul</p>
            </div>
          </div>
        </div>

        {/* URL 바 */}
        <div className="mt-3.5 flex items-center gap-2 max-w-[375px] mx-auto">
          <div className="flex-1 bg-white border border-[#E8E6E1] rounded-[10px] px-3 py-2.5 text-[12px] text-[#1B2537] font-medium truncate">
            {pageUrl}
          </div>
          <button type="button" onClick={copyUrl} className="border border-[#E8E6E1] bg-white rounded-[10px] px-3 py-2.5 text-[12px] font-bold text-[#1B2537] whitespace-nowrap">
            {copied ? '복사됨 ✓' : '복사'}
          </button>
          {pageOpen ? (
            <a href={`https://${pageUrl}`} target="_blank" rel="noreferrer"
              className="bg-[#B08A4F] text-white rounded-[10px] px-3 py-2.5 text-[12px] font-bold whitespace-nowrap">
              열기 ↗
            </a>
          ) : (
            <span className="bg-[#EFEDE8] text-[#9a9080] rounded-[10px] px-3 py-2.5 text-[12px] font-bold whitespace-nowrap" title="영문 소개를 저장하면 열립니다">
              미개설
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
