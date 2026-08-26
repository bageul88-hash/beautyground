import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  getMyBrandAccess,
  updateMyExportDetails,
  setMyProductExportFeatured,
  updateMyProductExportContent,
  updateMyExportLogo,
  updateMyExportStoryImages,
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
const MAX_STORY_IMAGES = 5

type ProductRow = Pick<
  Product,
  'id' | 'name' | 'thumbnail_url' | 'status' | 'is_export_featured' | 'export_image_urls' | 'export_description' | 'export_description_en'
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
    <div className={`bg-white rounded-lg border mb-2 overflow-hidden transition-colors ${open ? 'border-[#111111] shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : 'border-[#E8E6E1]'}`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className={`w-[26px] h-[26px] rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0 bg-[#111111]`}>{num}</span>
        <span className="flex-1">
          <span className="block text-[14px] font-bold text-[#111111]">{title}</span>
          <span className="block text-[11px] text-[#6B7280] mt-0.5">{sub}</span>
        </span>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${chipTone === 'ok' ? 'bg-[#E8F3EC] text-[#2E7D4F]' : 'bg-[#FDECEC] text-[#E53E3E]'}`}>{chip}</span>
        <span className={`text-[10px] text-[#B9B5AD] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-dashed border-[#E8E6E1]">{children}</div>}
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
  const [storyImages, setStoryImages] = useState<string[]>([])
  const [storyUploading, setStoryUploading] = useState(false)
  const [storyError, setStoryError] = useState('')
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
  const [newProductName, setNewProductName] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

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
        setStoryImages(p.export_story_images ?? [])
        // 자동 임시저장본 복원 — 저장 안 하고 나갔다 와도 이어서 작업 (localStorage, 저장 성공 시 비움)
        try {
          const raw = localStorage.getItem(`bg_export_draft_${p.id}`)
          if (raw) {
            const d = JSON.parse(raw)
            if (typeof d.pitch === 'string') setPitch(d.pitch)
            if (typeof d.pitchEn === 'string') setPitchEn(d.pitchEn)
            if (Array.isArray(d.certifications)) setCertifications(d.certifications)
            if (typeof d.countries === 'string') setCountries(d.countries)
            if (typeof d.moqNotes === 'string') setMoqNotes(d.moqNotes)
            setDraftRestored(true)
            setTimeout(() => setDraftRestored(false), 6000)
          }
        } catch { /* 무시 */ }
        // hidden = 셀프 가입 브랜드가 직접 만든 수출 전용 상품(쇼핑몰 비노출) — 함께 불러온다
        const { data } = await supabase
          .from('products')
          .select('id,name,thumbnail_url,status,is_export_featured,export_image_urls,export_description,export_description_en')
          .eq('partner_id', p.id)
          .in('status', ['on_sale', 'hidden'])
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

  // 자동 임시저장 — 입력 후 0.8초 지나면 브라우저에 보관 (저장 성공 시 handleSaveDetails에서 비움)
  useEffect(() => {
    if (!partner || loading) return
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          `bg_export_draft_${partner.id}`,
          JSON.stringify({ pitch, pitchEn, certifications, countries, moqNotes, ts: Date.now() })
        )
      } catch { /* 저장공간 부족 등은 무시 */ }
    }, 800)
    return () => clearTimeout(id)
  }, [partner, loading, pitch, pitchEn, certifications, countries, moqNotes])

  // 셀프 가입 브랜드의 수출 전용 상품 직접 추가 (status=hidden — 쇼핑몰에는 노출되지 않음)
  const handleAddProduct = async () => {
    const name = newProductName.trim()
    if (!name || addingProduct) return
    setAddingProduct(true)
    setFeatureError('')
    const { data, error: rpcError } = await supabase.rpc('create_my_export_product', { p_name: name })
    setAddingProduct(false)
    if (rpcError || !data) {
      setFeatureError(rpcError?.message?.includes('제품명') ? rpcError.message : '제품 추가에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    const row = data as ProductRow
    setProducts((prev) => [row, ...prev])
    setDrafts((prev) => ({ ...prev, [row.id]: draftFrom(row) }))
    setNewProductName('')
  }

  // 직접 만든 수출 전용 상품 삭제 (hidden 상품만 — 쇼핑몰 판매 상품은 불가)
  const handleDeleteProduct = async (product: ProductRow) => {
    if (!confirm(`'${product.name}' 제품을 삭제할까요? 등록한 사진·설명도 함께 사라집니다.`)) return
    const { error: rpcError } = await supabase.rpc('delete_my_export_product', { p_product_id: product.id })
    if (rpcError) {
      setFeatureError('삭제에 실패했습니다.')
      return
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
    setDrafts((prev) => { const n = { ...prev }; delete n[product.id]; return n })
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

  // 브랜드 스토리 사진 — 캡션 없이 사진만, 업로드/삭제 즉시 저장(로고와 동일한 방식)
  const handleAddStoryImages = async (files: FileList) => {
    if (!partner) return
    const remaining = MAX_STORY_IMAGES - storyImages.length
    if (remaining <= 0) {
      setStoryError(`사진은 최대 ${MAX_STORY_IMAGES}장까지 등록할 수 있습니다.`)
      return
    }
    setStoryUploading(true)
    setStoryError('')
    try {
      const toUpload = Array.from(files).slice(0, remaining)
      const urls = await Promise.all(toUpload.map((f) => uploadExportImage(f, partner.id, 'story')))
      const next = [...storyImages, ...urls]
      setStoryImages(next)
      const updated = await updateMyExportStoryImages(next)
      setPartner(updated)
    } catch {
      setStoryError('사진 업로드에 실패했습니다.')
    } finally {
      setStoryUploading(false)
    }
  }

  const removeStoryImage = async (url: string) => {
    if (!partner) return
    const prev = storyImages
    const next = storyImages.filter((u) => u !== url)
    setStoryImages(next)
    try {
      const updated = await updateMyExportStoryImages(next)
      setPartner(updated)
    } catch {
      setStoryImages(prev)
      setStoryError('삭제에 실패했습니다.')
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
      // 상품 다국어 번역 — 브랜드 저장 이후에 추가된 상품도 9개 언어가 생기도록 저장 때마다 갱신
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) {
        setTranslateNote('🌐 상품 다국어 번역 생성 중… (수 분 내 자동 반영)')
        fetch('/api/export-brand?action=translate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
          .then(async (r) => {
            if (r.ok) {
              const d = await r.json()
              setTranslateNote(`🌐 번역 완료 — 상품 ${d.products}개`)
            } else {
              setTranslateNote('')
            }
            setTimeout(() => setTranslateNote(''), 8000)
          })
          .catch(() => setTranslateNote(''))
      }
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
      // 서버 저장 성공 → 브라우저 임시저장본은 역할 끝
      try { localStorage.removeItem(`bg_export_draft_${updated.id}`) } catch { /* no-op */ }
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

  const inputCls = 'w-full px-3 py-2 border border-[#E8E6E1] rounded-md text-[13px] text-[#111111] placeholder:text-[#c4bcae] bg-[#FBFAF8] focus:outline-none focus:border-[#111111] transition-colors'

  return (
    <div className="grid lg:grid-cols-[minmax(0,600px)_400px] gap-8 items-start justify-center">
      {/* ══════ 좌: 기본 정보 입력 (고정 슬롯) ══════ */}
      <div>
        {/* 완성도 게이지 */}
        <div className="bg-white rounded-lg border border-[#E8E6E1] px-4 py-3.5 mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[15px] font-bold text-[#111111]">수출 페이지 완성도</p>
            <span className="text-[13px] font-bold text-[#E53E3E]">{completion}%</span>
          </div>
          <div className="h-2 bg-[#EFEDE8] rounded-full overflow-hidden">
            <i className="block h-full rounded-full bg-[#E53E3E] transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          <p className="text-[12px] text-[#6B7280] mt-2">💡 {nextHint}</p>
          {draftRestored && (
            <p className="text-[11.5px] text-[#2E7D4F] mt-1.5">이전에 작성하던 내용(임시저장)을 불러왔습니다 — 저장 버튼을 눌러야 페이지에 반영됩니다.</p>
          )}
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
              <span className="inline-block bg-white border border-[#E6E3DC] rounded-[10px] px-4 py-2 text-[12.5px] font-bold text-[#16202F]">
                {logoUploading ? '업로드 중…' : partner.export_logo_url ? '로고 변경' : '로고 업로드'}
              </span>
              <input type="file" accept="image/*" className="hidden" disabled={logoUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); e.target.value = '' }} />
            </label>
          </div>
          <p className="text-[12px] font-bold text-[#111111] mb-1.5">브랜드 소개 (한글)</p>
          <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={3}
            placeholder="예: OO은 2020년 설립된 스킨케어 브랜드로, 핵심 성분과 대표 제품, 국내 실적을 담아 소개해 주세요."
            className={`${inputCls} resize-none mb-3`} />
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-bold text-[#111111]">영문 소개 <span className="text-[#E53E3E]">*</span> <span className="font-normal text-[#6B7280]">— 바이어에게 표시</span></p>
            <button type="button" onClick={() => void handleTranslatePitch()} disabled={translatingPitch || !pitch.trim()}
              className="text-[12px] text-[#111111] font-bold underline underline-offset-2 disabled:opacity-40">
              {translatingPitch ? '번역 중…' : '한글 소개 번역하기 →'}
            </button>
          </div>
          <textarea value={pitchEn} onChange={(e) => setPitchEn(e.target.value)} rows={3}
            placeholder="번역하기를 누르면 자동으로 채워집니다. 이 내용을 저장하는 순간 내 수출 페이지가 열립니다."
            className={`${inputCls} resize-none`} />
        </Slot>

        {/* 슬롯 2 — 인증·수출 정보 */}
        <Slot
          num={2} title="인증 · 수출 정보" sub="보유 인증 · 수출 중인 국가 · MOQ/샘플 정책"
          chip={certifications.length > 0 || moqNotes.trim() ? '완료' : '비어있음'} chipTone={certifications.length > 0 || moqNotes.trim() ? 'ok' : 'warn'}
          open={openSlot === 2} onToggle={() => setOpenSlot(openSlot === 2 ? 0 : 2)}
        >
          <p className="text-[12px] font-bold text-[#111111] mt-4 mb-2">보유 인증 <span className="font-normal text-[#6B7280]">— 있는 것만, 바이어 신뢰의 핵심</span></p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CERTIFICATION_OPTIONS.map((cert) => {
              const active = certifications.includes(cert)
              return (
                <button key={cert} type="button" onClick={() => toggleCert(cert)}
                  className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${active ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#6B7280] border-[#E8E6E1] hover:border-[#111111]'}`}>
                  {cert}
                </button>
              )
            })}
            {certifications.filter((c) => !CERTIFICATION_OPTIONS.includes(c)).map((cert) => (
              <button key={cert} type="button" onClick={() => toggleCert(cert)} title="클릭하면 삭제됩니다"
                className="px-3 py-1.5 rounded-full text-[12px] border bg-[#111111] text-white border-[#111111] flex items-center gap-1">
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
                  placeholder="예: GMP" className="px-3 py-1.5 border border-[#111111] rounded-full text-[12px] focus:outline-none w-[120px]" />
                <button type="button" onClick={addCustomCert} className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#111111] text-white">추가</button>
              </span>
            ) : (
              <button type="button" onClick={() => setAddingCert(true)}
                className="px-3 py-1.5 rounded-full text-[12px] border border-dashed border-[#c4bcae] text-[#9a9080] hover:border-[#111111] hover:text-[#111111]">
                + 추가
              </button>
            )}
          </div>
          <p className="text-[12px] font-bold text-[#111111] mb-1.5">이미 수출 중인 국가 <span className="font-normal text-[#6B7280]">(있다면)</span></p>
          <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="예: Japan, Vietnam" className={`${inputCls} mb-3`} />
          <p className="text-[12px] font-bold text-[#111111] mb-1.5">MOQ · 샘플 정책</p>
          <textarea value={moqNotes} onChange={(e) => setMoqNotes(e.target.value)} rows={2}
            placeholder="예: 100 pcs / SKU, 샘플 제공 가능(수량 협의)" className={`${inputCls} resize-none`} />
        </Slot>

        {/* 슬롯 3 — 대표상품 선택 */}
        <Slot
          num={3} title="수출 대표상품" sub={`바이어에게 먼저 보여줄 상품 — 최대 ${MAX_FEATURED}개`}
          chip={featuredCount > 0 ? `${featuredCount}개 선택` : '비어있음'} chipTone={featuredCount > 0 ? 'ok' : 'warn'}
          open={openSlot === 3} onToggle={() => setOpenSlot(openSlot === 3 ? 0 : 3)}
        >
          {/* 제품 직접 추가 — 쇼핑몰 상품이 없는 셀프 가입 브랜드도 여기서 만든다 (수출 전용, 쇼핑몰 비노출) */}
          <div className="flex gap-2 mt-4">
            <input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddProduct() } }}
              placeholder="제품명 입력 후 추가 (예: 앰플 글로우 쿠션 23g)"
              maxLength={80}
              className={inputCls}
            />
            <button type="button" onClick={() => void handleAddProduct()} disabled={addingProduct || !newProductName.trim()}
              className="shrink-0 bg-[#111111] text-white rounded-md px-4 text-[12.5px] font-bold disabled:opacity-40">
              {addingProduct ? '추가 중…' : '+ 제품 추가'}
            </button>
          </div>
          {featureError && <p className="text-[12.5px] text-red-600 mt-2.5">{featureError}</p>}
          {products.length === 0 ? (
            <p className="text-[12.5px] text-[#9a9080] py-5 text-center">아직 제품이 없습니다 — 위에서 제품명을 입력해 추가해 주세요.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-4">
              {products.map((product) => {
                const img = product.thumbnail_url ?? product.export_image_urls?.[0] ?? ''
                return (
                  <div key={product.id} className="relative">
                    <button type="button" onClick={() => void toggleFeatured(product)}
                      className={`w-full text-left rounded-[10px] border-2 overflow-hidden transition-colors ${product.is_export_featured ? 'border-[#111111]' : 'border-transparent hover:border-[#E8E6E1]'}`}>
                      <div className="relative">
                        {img ? (
                          <img src={img} alt={product.name} className="w-full aspect-square object-cover bg-[#f7f4ef]" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-square bg-[#FAF9F6] border-b border-[#E8E6E1] flex items-center justify-center text-[10px] text-[#9a9080] px-1 text-center">
                            4번에서 사진을<br />올려주세요
                          </div>
                        )}
                        {product.is_export_featured && (
                          <span className="absolute top-1.5 right-1.5 bg-[#111111] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">✓</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#23272F] mt-1 px-0.5 truncate">{product.name}</p>
                    </button>
                    {product.status === 'hidden' && (
                      <button type="button" onClick={() => void handleDeleteProduct(product)} aria-label="제품 삭제"
                        className="absolute -top-1.5 -left-1.5 bg-white border border-[#E8E6E1] text-[#9a9080] hover:text-red-600 rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow-sm">
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
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
                      <label className="aspect-square rounded-[8px] border-1.5 border border-dashed border-[#D8D4C9] bg-[#FAF9F6] flex items-center justify-center cursor-pointer">
                        <span className="text-[13px] text-[#8A8577] font-bold">{draft.uploading ? '…' : '＋'}</span>
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
                      className="text-[11.5px] text-[#111111] font-bold underline underline-offset-2 disabled:opacity-40">
                      {draft.translating ? '번역 중…' : '번역하기 →'}
                    </button>
                  </div>
                  <textarea value={draft.descriptionEn} onChange={(e) => patchDraft(product.id, { descriptionEn: e.target.value })} rows={2}
                    placeholder="번역하기를 누르면 자동으로 채워집니다." className={`${inputCls} resize-none mb-2`} />
                  {draft.error && <p className="text-[12px] text-red-600 mb-1.5">{draft.error}</p>}
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => void handleSaveProduct(product.id)} disabled={draft.saving}
                      className="bg-[#111111] text-white rounded-md px-3.5 py-1.5 text-[12px] font-bold disabled:opacity-50">
                      {draft.saving ? '저장 중…' : '이 상품 저장'}
                    </button>
                    {draft.saved && <span className="text-[12px] text-[#111111] font-bold">저장되었습니다 ✓</span>}
                  </div>
                </div>
              )
            })
          )}
        </Slot>

        {/* 슬롯 5 — 브랜드 스토리 사진 (캡션 없음, 업로드 즉시 저장) */}
        <Slot
          num={5} title="브랜드 스토리 사진" sub={`캡션 없이 사진만 — 최대 ${MAX_STORY_IMAGES}장, 올리면 바로 반영됩니다`}
          chip={storyImages.length > 0 ? `${storyImages.length}장 등록` : '비어있음'} chipTone={storyImages.length > 0 ? 'ok' : 'warn'}
          open={openSlot === 5} onToggle={() => setOpenSlot(openSlot === 5 ? 0 : 5)}
        >
          <div className="grid grid-cols-5 gap-1.5 mt-4">
            {storyImages.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-full aspect-square object-cover rounded-[8px] border border-[#E8E6E1]" />
                <button type="button" onClick={() => void removeStoryImage(url)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]" aria-label="삭제">✕</button>
              </div>
            ))}
            {storyImages.length < MAX_STORY_IMAGES && (
              <label className="aspect-square rounded-[8px] border border-dashed border-[#D8D4C9] bg-[#FAF9F6] flex items-center justify-center cursor-pointer">
                <span className="text-[13px] text-[#8A8577] font-bold">{storyUploading ? '…' : '＋'}</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={storyUploading}
                  onChange={(e) => { if (e.target.files?.length) void handleAddStoryImages(e.target.files); e.target.value = '' }} />
              </label>
            )}
          </div>
          {storyError && <p className="text-[12px] text-red-600 mt-2">{storyError}</p>}
        </Slot>

        {/* 안내 + 브랜드 정보 저장 */}
        <div className="bg-[#FAF9F6] border border-[#E6E3DC] rounded-lg px-4 py-3 mb-3 flex gap-3 items-start">
          <span className="text-[16px]">🔒</span>
          <p className="text-[11.5px] text-[#9A8768] leading-relaxed">
            바이어 발굴·컨택·협상은 뷰티그라운드 수출팀이 전담하며, 바이어 정보는 브랜드사에 공개되지 않습니다.
            페이지의 실적 영역(PROVEN IN KOREA)은 뷰티그라운드가 실데이터로 자동 관리합니다.
          </p>
        </div>
        {error && <p className="text-[13px] text-red-600 mb-2">{error}</p>}
        {translateNote && <p className="text-[12.5px] text-[#5A564B] bg-[#FAF9F6] border border-[#E6E3DC] rounded-lg px-3 py-2 mb-2">{translateNote}</p>}
        <div className="sticky bottom-4 flex items-center gap-3">
          <button onClick={() => void handleSaveDetails()} disabled={saving}
            className="flex-1 bg-[#E53E3E] text-white rounded-lg py-3 text-[13.5px] font-bold shadow-md hover:opacity-95 disabled:opacity-50">
            {saving ? '저장 중…' : '브랜드 정보 저장'}
          </button>
          {saved && <span className="text-[13px] text-[#111111] font-bold whitespace-nowrap">저장 완료 ✓</span>}
        </div>
      </div>

      {/* ══════ 우: 폰 미리보기 (실시간) — 바이어 페이지(/x) 라인시트 v3와 동일한 모습 ══════ */}
      <div className="lg:sticky lg:top-6 order-first lg:order-none">
        <p className="text-[12px] text-[#6B7280] text-center mb-3">바이어에게 보이는 화면 — <b className="text-[#16202F]">실시간 미리보기</b></p>
        <div className="mx-auto w-full max-w-[375px] rounded-[38px] overflow-hidden shadow-[0_24px_60px_rgba(22,32,47,0.2),0_0_0_10px_#1C1E22,0_0_0_12px_#3A3D44]">
          {/* 실제 모바일 비율(≈375×780) — 콘텐츠가 짧아도 CTA가 폰 하단에 붙도록 flex 컬럼로 채운다 */}
          <div className="h-[780px] max-h-[calc(100vh-170px)] min-h-[560px] overflow-y-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative flex flex-col">
            {/* 상단: 플랫폼 표기 + 언어 */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <p className="text-[8.5px] tracking-[0.28em] text-[#8A8577]">BEAUTYGROUND <span className="text-[#E53E3E]">EXPORT</span></p>
              <span className="text-[8.5px] tracking-[0.06em] text-[#8A8577] border border-[#E6E3DC] px-2 py-0.5">English ▾</span>
            </div>
            <div className="mx-4 h-px bg-[#16202F]" />
            {/* 브랜드 헤더 — 라인시트 표지 */}
            <div className="px-4 pt-4 pb-4 relative">
              <div className="pr-16">
                {partner.export_logo_url && (
                  <img src={partner.export_logo_url} alt="" className="w-9 h-9 object-cover border border-[#E6E3DC] mb-2.5" />
                )}
                <p className="font-serif text-[20px] leading-[1.15] text-[#16202F] break-keep">{partner.brand_name}</p>
                {pitchEn.trim() ? (
                  <p className="text-[10px] text-[#5A564B] leading-[1.7] mt-2">{pitchEn}</p>
                ) : (
                  <p className="text-[9.5px] text-[#E53E3E] leading-[1.6] mt-2">⚠️ 영문 소개가 들어갈 자리입니다 — 저장하면 페이지가 열립니다</p>
                )}
                {(countries.trim() || moqNotes.trim()) && (
                  <p className="text-[8px] tracking-[0.05em] text-[#8A8577] mt-2.5 uppercase">
                    {countries.trim() && <>Exporting — <span className="text-[#16202F]">{countries}</span></>}
                    {countries.trim() && moqNotes.trim() && <span className="mx-1.5 text-[#D8D4C9]">|</span>}
                    {moqNotes.trim() && <>MOQ — <span className="text-[#16202F]">{moqNotes.length > 20 ? moqNotes.slice(0, 20) + '…' : moqNotes}</span></>}
                  </p>
                )}
              </div>
            </div>
            {/* PROVEN — 스펙 테이블 */}
            <div className="px-4 pb-1">
              <p className="text-[8px] tracking-[0.24em] uppercase text-[#111111] pb-1.5 border-b border-[#111111]">Proven in Korea</p>
              <table className="w-full">
                <tbody>
                  {[['Retail', 'AK Department Store — on display'], ['Online', 'beautyground.co.kr — selling now'], ['Trade', 'Direct buy & resell by Beautyground']].map(([label, value]) => (
                    <tr key={label} className="border-b border-[#EBE8E0]">
                      <td className="py-1.5 pr-2 text-[7.5px] tracking-[0.1em] uppercase text-[#8A8577] whitespace-nowrap align-top w-[54px]">{label}</td>
                      <td className="py-1.5 text-[9px] text-[#16202F] leading-relaxed">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 제품 — 2열 그리드 */}
            <div className="px-4 pt-4">
              <div className="flex items-baseline justify-between pb-1.5 border-b border-[#16202F]">
                <p className="text-[8px] tracking-[0.24em] uppercase text-[#111111]">Products</p>
                <p className="text-[8px] text-[#B9B4A8]">{String(previewProducts.length).padStart(2, '0')}</p>
              </div>
              {previewProducts.length === 0 ? (
                <div className="border border-dashed border-[#D8D4C9] bg-[#FAF9F6] py-5 text-center text-[9px] text-[#8A8577] mt-3 mb-3">
                  ⚠️ 대표상품이 들어갈 자리입니다 — 3번에서 선택해 주세요
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 pt-3 pb-3">
                  {previewProducts.map((p) => {
                    const img = drafts[p.id]?.images[0] ?? p.export_image_urls?.[0] ?? p.thumbnail_url ?? ''
                    return (
                      <figure key={p.id}>
                        <div className="border border-[#E6E3DC] bg-[#FAF9F6]">
                          <img src={img} alt="" className="w-full aspect-square object-cover mix-blend-multiply" />
                        </div>
                        <figcaption className="mt-1.5">
                          <p className="text-[9px] font-medium text-[#16202F] leading-[1.4] line-clamp-2">{p.name}</p>
                          <p className="text-[8px] text-[#E53E3E] mt-0.5">Wholesale on request</p>
                        </figcaption>
                      </figure>
                    )
                  })}
                </div>
              )}
            </div>
            {/* 브랜드 스토리 사진 — 캡션 없음 */}
            {storyImages.length > 0 && (
              <div className="px-4 pt-4 pb-1">
                <p className="text-[8px] tracking-[0.24em] uppercase text-[#111111] pb-1.5 border-b border-[#111111]">From the Brand</p>
                <div className="grid grid-cols-2 gap-2 pt-3">
                  {storyImages.map((url) => (
                    <div key={url} className="border border-[#E6E3DC] bg-[#FAF9F6]">
                      <img src={url} alt="" className="w-full aspect-square object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 인증 */}
            {certifications.length > 0 && (
              <div className="px-4 pt-2 pb-3">
                <p className="text-[8px] tracking-[0.24em] uppercase text-[#111111] pb-1.5 border-b border-[#111111]">Certifications</p>
                <p className="pt-2 text-[9px] text-[#16202F] leading-[1.9]">
                  {certifications.map((c, i) => (
                    <span key={c}>{c}{i < certifications.length - 1 && <span className="mx-1.5 text-[#D8D4C9]">·</span>}</span>
                  ))}
                </p>
              </div>
            )}
            <div className="flex-1" />
            {/* 글래스 캡슐 CTA */}
            <div className="sticky bottom-0 px-3.5 pt-4 pb-3 bg-gradient-to-t from-white via-white/60 to-transparent">
              <div className="flex gap-2">
                <div className="flex-1 text-center rounded-full py-2 text-[9px] tracking-[0.05em] text-[#16202F] bg-white/55 border border-white/90 backdrop-blur-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_14px_rgba(70,90,190,0.14)]">
                  Shop retail
                </div>
                <div className="flex-[1.4] text-center rounded-full py-2 text-[9px] tracking-[0.05em] text-white bg-[#E53E3E]/85 border border-white/25 backdrop-blur-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_16px_rgba(229,62,62,0.28)]">
                  Wholesale inquiry <span className="text-white/80 text-[7.5px] ml-0.5">24h</span>
                </div>
              </div>
              <p className="text-center text-[7px] text-[#B9B4A8] mt-1.5">Retail and export are both handled by Beautyground, Seoul.</p>
            </div>
          </div>
        </div>

        {/* URL 바 */}
        <div className="mt-3.5 flex items-center gap-2 max-w-[375px] mx-auto">
          <div className="flex-1 bg-white border border-[#E8E6E1] rounded-[10px] px-3 py-2.5 text-[12px] text-[#111111] font-medium truncate">
            {pageUrl}
          </div>
          <button type="button" onClick={copyUrl} className="border border-[#E8E6E1] bg-white rounded-[10px] px-3 py-2.5 text-[12px] font-bold text-[#111111] whitespace-nowrap">
            {copied ? '복사됨 ✓' : '복사'}
          </button>
          {pageOpen ? (
            <a href={`https://${pageUrl}`} target="_blank" rel="noreferrer"
              className="bg-[#111111] text-white rounded-[10px] px-3 py-2.5 text-[12px] font-bold whitespace-nowrap">
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
