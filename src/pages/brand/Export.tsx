import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyPartner, updateMyExportDetails, setMyProductExportFeatured } from '../../lib/partner'
import type { Partner, Product } from '../../lib/types'

const CERTIFICATION_OPTIONS = ['CPNP(EU)', 'FDA(US)', '비건', '할랄', '유기농', 'ISO22716', '동물실험 안전']
const MAX_FEATURED = 5

interface ProductRow {
  id: string
  name: string
  thumbnail_url: string | null
  is_export_featured: boolean
}

export default function BrandExport() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [pitch, setPitch] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [countries, setCountries] = useState('')
  const [moqNotes, setMoqNotes] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
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
          .select('id,name,thumbnail_url,is_export_featured')
          .eq('partner_id', p.id)
          .eq('status', 'on_sale')
          .order('name')
        if (active) setProducts((data ?? []) as ProductRow[])
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const toggleCert = (cert: string) => {
    setCertifications((prev) => (prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]))
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
    try {
      await setMyProductExportFeatured(product.id, next)
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_export_featured: !next } : p)))
      setFeatureError('저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  const handleSave = async () => {
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
      setPartner(updated)
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
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-[#0e0c08] text-white rounded-[10px] px-6 py-3 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          {saved && <span className="text-[13px] text-[#b8924a] font-medium">저장되었습니다</span>}
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[14px] font-semibold text-[#111]">수출 대표상품 선택</p>
          <span className="text-[12px] text-[#9a9080]">{featuredCount}/{MAX_FEATURED}</span>
        </div>
        <p className="text-[12.5px] text-[#9a9080] mb-4">
          해외 바이어에게 먼저 보여줄 대표상품을 최대 {MAX_FEATURED}개까지 선택해 주세요.
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
    </>
  )
}
