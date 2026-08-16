import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import LanguageSwitcher from '../../components/export/LanguageSwitcher'
import { supabase } from '../../lib/supabase'
import type { ExportBrandPublic } from '../../lib/types'
import { type Lang, detectLang, CATEGORY_I18N } from '../../lib/exportI18n'

interface ProductRow {
  id: string
  name: string
  thumbnail_url: string | null
  category: string | null
  export_image_urls: string[]
  export_description: string | null
  export_description_en: string | null
  partner_id: string
}

interface RelatedProduct {
  id: string
  name: string
  thumbnail_url: string | null
  export_image_urls: string[]
}

interface Copy {
  backAll: string
  certificationsLabel: string
  descriptionLabel: string
  moqLabel: string
  requestQuote: string
  relatedTitle: string
  notFound: string
}

const COPY: Record<Lang, Copy> = {
  ko: {
    backAll: '← 전체 상품으로',
    certificationsLabel: '보유 인증',
    descriptionLabel: '제품 소개',
    moqLabel: 'MOQ · 샘플 정책',
    requestQuote: '견적 문의하기',
    relatedTitle: '같은 브랜드의 다른 상품',
    notFound: '상품을 찾을 수 없습니다.',
  },
  en: {
    backAll: '← All Products',
    certificationsLabel: 'Certifications',
    descriptionLabel: 'Product Description',
    moqLabel: 'MOQ · Sample Policy',
    requestQuote: 'Request Quote',
    relatedTitle: 'More From This Brand',
    notFound: 'Product not found.',
  },
  ja: {
    backAll: '← すべての商品へ',
    certificationsLabel: '取得認証',
    descriptionLabel: '商品紹介',
    moqLabel: 'MOQ・サンプルポリシー',
    requestQuote: '見積もりを依頼する',
    relatedTitle: 'このブランドの他の商品',
    notFound: '商品が見つかりません。',
  },
  zh: {
    backAll: '← 返回全部产品',
    certificationsLabel: '认证信息',
    descriptionLabel: '产品介绍',
    moqLabel: 'MOQ·样品政策',
    requestQuote: '索取报价',
    relatedTitle: '该品牌的其他产品',
    notFound: '未找到该产品。',
  },
  es: {
    backAll: '← Todos los Productos',
    certificationsLabel: 'Certificaciones',
    descriptionLabel: 'Descripción del Producto',
    moqLabel: 'MOQ · Política de Muestras',
    requestQuote: 'Solicitar Cotización',
    relatedTitle: 'Más de Esta Marca',
    notFound: 'Producto no encontrado.',
  },
}

export default function ExportProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<ProductRow | null>(null)
  const [brand, setBrand] = useState<ExportBrandPublic | null>(null)
  const [related, setRelated] = useState<RelatedProduct[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>(detectLang)

  const t = COPY[lang]
  const catLabel = (cat: string) => CATEGORY_I18N[lang][cat] ?? cat

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: productRow } = await supabase
        .from('products')
        .select('id,name,thumbnail_url,category,export_image_urls,export_description,export_description_en,partner_id')
        .eq('id', id)
        .eq('is_export_featured', true)
        .maybeSingle()
      if (cancelled) return
      setProduct((productRow as ProductRow | null) ?? null)
      setActiveImage(0)

      if (productRow) {
        const [{ data: brandRow }, { data: relatedRows }] = await Promise.all([
          supabase.from('export_brand_public').select('*').eq('id', (productRow as ProductRow).partner_id).maybeSingle(),
          supabase
            .from('products')
            .select('id,name,thumbnail_url,export_image_urls')
            .eq('partner_id', (productRow as ProductRow).partner_id)
            .eq('is_export_featured', true)
            .eq('status', 'on_sale')
            .neq('id', id),
        ])
        if (cancelled) return
        setBrand((brandRow as ExportBrandPublic | null) ?? null)
        setRelated((relatedRows ?? []) as RelatedProduct[])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  const images = product ? (product.export_image_urls.length > 0 ? product.export_image_urls : [product.thumbnail_url].filter((v): v is string => !!v)) : []

  return (
    <>
      <GNB extra={<LanguageSwitcher lang={lang} setLang={setLang} />} />
      <main className="bg-paper min-h-screen px-6 py-12 sm:py-16">
        {loading ? (
          <div className="max-w-[1080px] mx-auto text-center py-20 text-ink-soft text-[14px]">…</div>
        ) : !product ? (
          <div className="max-w-[1080px] mx-auto text-center py-20">
            <p className="text-ink-soft text-[14px] mb-4">{t.notFound}</p>
            <Link to="/export/products" className="text-[13px] text-ink underline">{t.backAll}</Link>
          </div>
        ) : (
          <div className="max-w-[1080px] mx-auto">
            <Link to="/export/products" className="text-[13px] text-ink-soft hover:text-ink transition-colors">
              {t.backAll}
            </Link>

            <div className="grid md:grid-cols-2 gap-10 mt-6">
              {/* 1) 이미지 갤러리 */}
              <div>
                <div className="rounded-card overflow-hidden border border-rule mb-3">
                  <img
                    src={images[activeImage] ?? ''}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={`rounded-control overflow-hidden border-2 transition-colors ${
                          i === activeImage ? 'border-ink' : 'border-transparent hover:border-rule'
                        }`}
                      >
                        <img src={url} alt="" className="w-full aspect-square object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {/* 2) 제품명 · 브랜드명 · 카테고리 */}
                {brand && (
                  <Link to={`/export/brands/${brand.id}`} className="text-[13px] font-semibold text-ink-soft hover:text-ink transition-colors">
                    {brand.brand_name}
                  </Link>
                )}
                <h1 className="text-[24px] sm:text-[28px] font-bold text-ink mt-1 mb-2">{product.name}</h1>
                {product.category && (
                  <p className="text-[12px] text-ink-faint uppercase tracking-wide mb-5">{catLabel(product.category)}</p>
                )}

                {/* 3) 인증 배지 */}
                {brand && brand.export_certifications.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[12px] text-ink-faint mb-2">{t.certificationsLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {brand.export_certifications.map((cert) => (
                        <span key={cert} className="px-2.5 py-1 rounded-pill text-[11px] border border-rule text-ink-soft">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4) 영문 설명 */}
                {(product.export_description_en || product.export_description) && (
                  <div className="mb-5">
                    <p className="text-[12px] text-ink-faint mb-2">{t.descriptionLabel}</p>
                    <p className="text-[14px] text-ink-soft leading-relaxed whitespace-pre-line">
                      {product.export_description_en || product.export_description}
                    </p>
                  </div>
                )}

                {/* 5) MOQ·샘플 정책 */}
                {brand?.export_moq_notes && (
                  <div className="mb-8">
                    <p className="text-[12px] text-ink-faint mb-1">{t.moqLabel}</p>
                    <p className="text-[13.5px] text-ink-soft">{brand.export_moq_notes}</p>
                  </div>
                )}

                {/* 6) CTA */}
                <Link
                  to={`/export?product=${encodeURIComponent(product.name)}#export-inquiry-form`}
                  className="inline-block bg-ink text-paper rounded-control px-6 py-3.5 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  {t.requestQuote}
                </Link>
              </div>
            </div>

            {/* 7) 관련상품 — 같은 브랜드의 다른 대표상품 */}
            {related.length > 0 && (
              <section className="mt-20 pt-12 border-t border-rule">
                <h2 className="text-[18px] font-bold text-ink mb-6">{t.relatedTitle}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {related.map((r) => (
                    <Link key={r.id} to={`/export/products/${r.id}`} className="group">
                      <figure className="rounded-card overflow-hidden border border-rule group-hover:border-ink transition-colors">
                        <img
                          src={r.export_image_urls[0] ?? r.thumbnail_url ?? ''}
                          alt={r.name}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                      </figure>
                      <p className="text-[13px] font-semibold text-ink mt-2 truncate">{r.name}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
