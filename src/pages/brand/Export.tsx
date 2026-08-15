import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  getMyPartner,
  updateMyExportDetails,
  setMyProductExportFeatured,
  updateMyProductExportContent,
  updateMyExportLogo,
  uploadExportImage,
  translateText,
} from '../../lib/partner'
import type { Partner, Product } from '../../lib/types'

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

export default function BrandExport() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [pitch, setPitch] = useState('')
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

  useEffect(() => {
    let active = true
    ;(async () => {
      const p = await getMyPartner()
      if (!active) return
      setPartner(p)
      if (p) {
        setPitch(p.export_pitch ?? '')
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

  const toggleCert = (cert: string) => {
    setCertifications((prev) => (prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]))
  }

  const addCustomCert = () => {
    const v = customCertInput.trim()
    if (v && !certifications.includes(v)) {
      setCertifications((prev) => [...prev, v])
    }
    setCustomCertInput('')
    setAddingCert(false)
  }

  const featuredCount = products.filter((p) => p.is_export_featured).length

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

  const handleSaveDetails = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await updateMyExportDetails({
        pitch: pitch.trim(),
        certifications,
        countries: countries.trim(),
        moqNotes: moqNotes.trim(),
      })
      setPartner((prev) => (prev ? { ...prev, ...updated } : updated))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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

  const featuredProducts = products.filter((p) => p.is_export_featured)

  return (
    <>
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <h1 className="text-[16px] font-bold text-[#111] mb-2">수출 소개 작성</h1>
        <p className="text-[13px] text-[#9a9080] leading-relaxed">
          뷰티그라운드가 해외 바이어에게 {partner.brand_name} 브랜드를 제안할 때 사용할 정보입니다.
          이 내용은 뷰티그라운드 담당자만 확인하며, 외부에 자동 공개되지 않습니다. 바이어 발굴·컨택은
          뷰티그라운드가 전담하며, 바이어 정보는 브랜드사에 공유되지 않습니다.
        </p>
      </div>

      {/* 브랜드 로고 */}
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <p className="text-[14px] font-semibold text-[#111] mb-3">브랜드 BI 로고</p>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-[10px] border border-[#e5e0d8] bg-[#f7f4ef] flex items-center justify-center overflow-hidden shrink-0">
            {partner.export_logo_url ? (
              <img src={partner.export_logo_url} alt={`${partner.brand_name} 로고`} className="w-full h-full object-contain" />
            ) : (
              <span className="text-[11px] text-[#c4bcae]">로고 없음</span>
            )}
          </div>
          <label className="cursor-pointer">
            <span className="inline-block bg-[#f7f4ef] border border-[#e5e0d8] rounded-[10px] px-4 py-2.5 text-[13px] text-[#111] hover:border-[#b8924a] transition-colors">
              {logoUploading ? '업로드 중…' : partner.export_logo_url ? '로고 변경' : '로고 업로드'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={logoUploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); e.target.value = '' }}
            />
          </label>
        </div>
      </div>

      {/* 브랜드 소개글 */}
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <p className="text-[14px] font-semibold text-[#111] mb-3">브랜드 소개글</p>
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          rows={8}
          placeholder="예: [브랜드명]은 20XX년 설립된 [카테고리] 브랜드로, [핵심 성분/기술]을 담은 [대표 제품]으로 국내에서 [실적]을 쌓아왔습니다..."
          className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors resize-none"
        />
      </div>

      {/* 인증/수출국가/MOQ */}
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <p className="text-[14px] font-semibold text-[#111] mb-3">보유 인증</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {CERTIFICATION_OPTIONS.map((cert) => {
            const active = certifications.includes(cert)
            return (
              <button
                key={cert}
                type="button"
                onClick={() => toggleCert(cert)}
                className={`px-3.5 py-2 rounded-full text-[12.5px] border transition-colors ${
                  active ? 'bg-[#0e0c08] text-white border-[#0e0c08]' : 'bg-white text-[#9a9080] border-[#e5e0d8] hover:border-[#b8924a]'
                }`}
              >
                {cert}
              </button>
            )
          })}

          {certifications
            .filter((c) => !CERTIFICATION_OPTIONS.includes(c))
            .map((cert) => (
              <button
                key={cert}
                type="button"
                onClick={() => toggleCert(cert)}
                title="클릭하면 삭제됩니다"
                className="px-3.5 py-2 rounded-full text-[12.5px] border bg-[#0e0c08] text-white border-[#0e0c08] flex items-center gap-1.5"
              >
                {cert}
                <span aria-hidden>×</span>
              </button>
            ))}

          {addingCert ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={customCertInput}
                onChange={(e) => setCustomCertInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomCert() }
                  if (e.key === 'Escape') { setAddingCert(false); setCustomCertInput('') }
                }}
                placeholder="예: KOSHA, GMP"
                className="px-3 py-2 border border-[#b8924a] rounded-full text-[12.5px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none w-[140px]"
              />
              <button
                type="button"
                onClick={addCustomCert}
                className="px-3 py-2 rounded-full text-[12.5px] font-semibold bg-[#b8924a] text-white"
              >
                추가
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCert(true)}
              className="px-3.5 py-2 rounded-full text-[12.5px] border border-dashed border-[#c4bcae] text-[#9a9080] hover:border-[#b8924a] hover:text-[#b8924a] transition-colors"
            >
              + 추가
            </button>
          )}
        </div>

        <p className="text-[14px] font-semibold text-[#111] mb-2">이미 수출 중인 국가 (있다면)</p>
        <input
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          placeholder="예: 일본, 베트남"
          className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors mb-6"
        />

        <p className="text-[14px] font-semibold text-[#111] mb-2">최소주문수량(MOQ)·샘플 정책</p>
        <textarea
          value={moqNotes}
          onChange={(e) => setMoqNotes(e.target.value)}
          rows={3}
          placeholder="예: MOQ 500개(SKU당), 샘플 제공 가능(수량 협의)"
          className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors resize-none"
        />

        {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => void handleSaveDetails()}
            disabled={saving}
            className="bg-[#0e0c08] text-white rounded-[10px] px-6 py-3 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          {saved && <span className="text-[13px] text-[#b8924a] font-medium">저장되었습니다</span>}
        </div>
      </div>

      {/* 대표상품 선택 */}
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[14px] font-semibold text-[#111]">수출 대표상품 선택</p>
          <span className="text-[12px] text-[#9a9080]">{featuredCount}/{MAX_FEATURED}</span>
        </div>
        <p className="text-[12.5px] text-[#9a9080] mb-4">
          해외 바이어에게 먼저 보여줄 대표상품을 최대 {MAX_FEATURED}개까지 선택해 주세요. 선택하면 아래에
          수출용 사진·설명을 따로 작성할 수 있습니다.
        </p>

        {featureError && <p className="text-[13px] text-red-600 mb-3">{featureError}</p>}

        {products.length === 0 ? (
          <p className="text-[13px] text-[#9a9080] py-6 text-center">판매중인 상품이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => void toggleFeatured(product)}
                className={`text-left rounded-[10px] border-2 overflow-hidden transition-colors ${
                  product.is_export_featured ? 'border-[#b8924a]' : 'border-transparent'
                }`}
              >
                <div className="relative">
                  <img
                    src={product.thumbnail_url ?? ''}
                    alt={product.name}
                    className="w-full aspect-square object-cover bg-[#f7f4ef]"
                    loading="lazy"
                  />
                  {product.is_export_featured && (
                    <span className="absolute top-2 right-2 bg-[#b8924a] text-white text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">✓</span>
                  )}
                </div>
                <p className="text-[12px] text-[#111] mt-1.5 px-0.5 truncate">{product.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 대표상품별 수출용 사진/설명 */}
      {featuredProducts.map((product) => {
        const draft = drafts[product.id] ?? draftFrom(product)
        return (
          <div key={product.id} className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
            <p className="text-[14px] font-semibold text-[#111] mb-1">{product.name}</p>
            <p className="text-[12px] text-[#9a9080] mb-4">수출용 사진·설명 (소비자용 상품 정보와 별개로 저장됩니다)</p>

            <p className="text-[13px] text-[#9a9080] mb-2">사진 ({draft.images.length}/{MAX_PRODUCT_IMAGES})</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
              {draft.images.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-[8px] border border-[#e5e0d8]" />
                  <button
                    type="button"
                    onClick={() => removeProductImage(product.id, url)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[11px]"
                    aria-label="이미지 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {draft.images.length < MAX_PRODUCT_IMAGES && (
                <label className="aspect-square rounded-[8px] border border-dashed border-[#e5e0d8] flex items-center justify-center cursor-pointer hover:border-[#b8924a] transition-colors">
                  <span className="text-[12px] text-[#9a9080]">{draft.uploading ? '업로드중…' : '+ 추가'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={draft.uploading}
                    onChange={(e) => { if (e.target.files?.length) void handleAddProductImages(product, e.target.files); e.target.value = '' }}
                  />
                </label>
              )}
            </div>

            <p className="text-[13px] text-[#9a9080] mb-2">설명 (한글)</p>
            <textarea
              value={draft.description}
              onChange={(e) => patchDraft(product.id, { description: e.target.value })}
              rows={4}
              placeholder="이 상품의 특징, 성분, 사용법 등을 자유롭게 작성해 주세요."
              className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors resize-none mb-3"
            />

            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] text-[#9a9080]">영문 설명</p>
              <button
                type="button"
                onClick={() => void handleTranslate(product.id)}
                disabled={draft.translating || !draft.description.trim()}
                className="text-[12px] text-[#b8924a] font-medium hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {draft.translating ? '번역 중…' : '한글 설명 번역하기 →'}
              </button>
            </div>
            <textarea
              value={draft.descriptionEn}
              onChange={(e) => patchDraft(product.id, { descriptionEn: e.target.value })}
              rows={4}
              placeholder="번역하기를 누르면 자동으로 채워집니다. 직접 수정도 가능합니다."
              className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors resize-none mb-3"
            />

            {draft.error && <p className="text-[13px] text-red-600 mb-2">{draft.error}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleSaveProduct(product.id)}
                disabled={draft.saving}
                className="bg-[#0e0c08] text-white rounded-[10px] px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
              >
                {draft.saving ? '저장 중…' : '이 상품 저장'}
              </button>
              {draft.saved && <span className="text-[13px] text-[#b8924a] font-medium">저장되었습니다</span>}
            </div>
          </div>
        )
      })}
    </>
  )
}
