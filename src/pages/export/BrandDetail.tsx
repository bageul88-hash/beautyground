import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import LanguageSwitcher from '../../components/export/LanguageSwitcher'
import { supabase } from '../../lib/supabase'
import type { ExportBrandPublic } from '../../lib/types'
import { type Lang, detectLang } from '../../lib/exportI18n'

interface BrandProduct {
  id: string
  name: string
  thumbnail_url: string | null
  export_image_urls: string[]
}

interface Copy {
  backAll: string
  exportingToLabel: string
  moqLabel: string
  certificationsLabel: string
  productsTitle: string
  requestQuote: string
  notFound: string
  noProducts: string
}

const COPY: Record<Lang, Copy> = {
  ko: {
    backAll: '← 뷰티그라운드 수출 소개로',
    exportingToLabel: '수출 중인 국가',
    moqLabel: 'MOQ · 샘플 정책',
    certificationsLabel: '보유 인증',
    productsTitle: '대표상품',
    requestQuote: '이 브랜드에 문의하기',
    notFound: '브랜드를 찾을 수 없습니다.',
    noProducts: '등록된 대표상품이 아직 없습니다.',
  },
  en: {
    backAll: '← Back to Beautyground Export',
    exportingToLabel: 'Currently Exporting To',
    moqLabel: 'MOQ · Sample Policy',
    certificationsLabel: 'Certifications',
    productsTitle: 'Featured Products',
    requestQuote: 'Contact This Brand',
    notFound: 'Brand not found.',
    noProducts: 'No featured products yet.',
  },
  ja: {
    backAll: '← Beautyground 輸出紹介へ戻る',
    exportingToLabel: '現在の輸出先国',
    moqLabel: 'MOQ・サンプルポリシー',
    certificationsLabel: '取得認証',
    productsTitle: '代表商品',
    requestQuote: 'このブランドに問い合わせる',
    notFound: 'ブランドが見つかりません。',
    noProducts: 'まだ登録された代表商品がありません。',
  },
  zh: {
    backAll: '← 返回Beautyground出口介绍',
    exportingToLabel: '目前出口至',
    moqLabel: 'MOQ·样品政策',
    certificationsLabel: '认证信息',
    productsTitle: '代表产品',
    requestQuote: '联系该品牌',
    notFound: '未找到该品牌。',
    noProducts: '暂无已登记的代表产品。',
  },
  es: {
    backAll: '← Volver a Beautyground Export',
    exportingToLabel: 'Actualmente Exportando A',
    moqLabel: 'MOQ · Política de Muestras',
    certificationsLabel: 'Certificaciones',
    productsTitle: 'Productos Destacados',
    requestQuote: 'Contactar Esta Marca',
    notFound: 'Marca no encontrada.',
    noProducts: 'Aún no hay productos destacados.',
  },
}

export default function ExportBrandDetail() {
  const { id } = useParams<{ id: string }>()
  const [brand, setBrand] = useState<ExportBrandPublic | null>(null)
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>(detectLang)

  const t = COPY[lang]

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const [{ data: brandRow }, { data: productRows }] = await Promise.all([
        supabase.from('export_brand_public').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('products')
          .select('id,name,thumbnail_url,export_image_urls')
          .eq('partner_id', id)
          .eq('is_export_featured', true)
          .eq('status', 'on_sale'),
      ])
      if (cancelled) return
      setBrand((brandRow as ExportBrandPublic | null) ?? null)
      setProducts((productRows ?? []) as BrandProduct[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  return (
    <>
      <GNB extra={<LanguageSwitcher lang={lang} setLang={setLang} />} />
      <main className="bg-paper min-h-screen px-6 py-12 sm:py-16">
        {loading ? (
          <div className="max-w-[880px] mx-auto text-center py-20 text-ink-soft text-[14px]">…</div>
        ) : !brand ? (
          <div className="max-w-[880px] mx-auto text-center py-20">
            <p className="text-ink-soft text-[14px] mb-4">{t.notFound}</p>
            <Link to="/export" className="text-[13px] text-ink underline">{t.backAll}</Link>
          </div>
        ) : (
          <div className="max-w-[880px] mx-auto">
            <Link to="/export" className="text-[13px] text-ink-soft hover:text-ink transition-colors">
              {t.backAll}
            </Link>

            <div className="flex items-center gap-4 mt-6 mb-6">
              {brand.export_logo_url ? (
                <img
                  src={brand.export_logo_url}
                  alt={brand.brand_name}
                  className="w-16 h-16 rounded-full object-cover border border-rule"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-quiet flex items-center justify-center text-[22px] font-bold text-ink-soft">
                  {brand.brand_name.charAt(0)}
                </div>
              )}
              <h1 className="text-[26px] sm:text-[32px] font-bold text-ink">{brand.brand_name}</h1>
            </div>

            {brand.export_certifications.length > 0 && (
              <div className="mb-6">
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

            {brand.export_pitch_en && (
              <p className="text-[15px] text-ink-soft leading-relaxed mb-6 max-w-[680px] whitespace-pre-line">
                {brand.export_pitch_en}
              </p>
            )}

            <div className="flex flex-wrap gap-x-10 gap-y-2 mb-12">
              {brand.export_countries && (
                <p className="text-[13px] text-ink-faint">
                  {t.exportingToLabel}: <span className="text-ink-soft">{brand.export_countries}</span>
                </p>
              )}
              {brand.export_moq_notes && (
                <p className="text-[13px] text-ink-faint">
                  {t.moqLabel}: <span className="text-ink-soft">{brand.export_moq_notes}</span>
                </p>
              )}
            </div>

            <Link
              to={`/export?product=${encodeURIComponent(brand.brand_name)}#export-inquiry-form`}
              className="inline-block bg-ink text-paper rounded-control px-6 py-3.5 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity mb-12"
            >
              {t.requestQuote}
            </Link>

            <h2 className="text-[18px] font-bold text-ink mb-6 pt-6 border-t border-rule">{t.productsTitle}</h2>
            {products.length === 0 ? (
              <p className="text-ink-soft text-[13.5px]">{t.noProducts}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {products.map((p) => (
                  <Link key={p.id} to={`/export/products/${p.id}`} className="group">
                    <figure className="rounded-card overflow-hidden border border-rule group-hover:border-ink transition-colors">
                      <img
                        src={p.export_image_urls[0] ?? p.thumbnail_url ?? ''}
                        alt={p.name}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                    </figure>
                    <p className="text-[13px] font-semibold text-ink mt-2 truncate">{p.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
