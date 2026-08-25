import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import { supabase } from '../lib/supabase'
import { useShopBrands } from '../hooks/useShopBrands'
import { PRODUCT_CATEGORIES } from '../lib/types'
import type { ExportBrandPublic } from '../lib/types'
import { COMPANY_INFO } from '../lib/companyInfo'
import { type Lang, detectLang, CATEGORY_I18N } from '../lib/exportI18n'
import LanguageSwitcher from '../components/export/LanguageSwitcher'

interface Copy {
  kicker: string
  h1_1: string
  h1_2: string
  heroBody: (count: string) => string
  stat1Label: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
  brandsKicker: string
  brandsTitle: string
  brandsBody: string
  viewAllProducts: string
  exportingToLabel: string
  moqLabel: string
  categoriesKicker: string
  categoriesTitle: string
  getInTouchKicker: string
  requestCatalogTitle: string
  requestCatalogBody: string
  thankYouTitle: string
  thankYouBody: string
  companyName: string
  contactName: string
  email: string
  phone: string
  country: string
  categoriesOfInterest: string
  message: string
  errorRequired: string
  errorEmail: string
  errorGeneric: string
  sending: string
  send: string
  orEmail: string
}

const COPY: Record<Lang, Copy> = {
  ko: {
    kicker: '해외 바이어 전용',
    h1_1: 'K-뷰티, 저희가',
    h1_2: '직접 공급합니다',
    heroBody: (count) =>
      `뷰티그라운드는 한국에서 백화점 뷰티샵과 온라인몰을 운영하며, ${count} K-뷰티 브랜드를 직접 매입해 판매하는 리셀러입니다 — 단순 중개 플랫폼이 아닙니다. 동일한 제품을 저희가 직접 소싱·배송하여 귀사의 시장에 공급해 드릴 수 있습니다.`,
    stat1Label: 'K-뷰티 브랜드',
    stat2Label: '설립 · 백화점 매장 운영',
    stat3Value: '직접',
    stat3Label: '매입 후 재판매 — 중개 아님',
    brandsKicker: '보유 브랜드',
    brandsTitle: '피처드 브랜드',
    brandsBody: '뷰티그라운드가 직접 매입·판매하는 브랜드 중 일부입니다.',
    viewAllProducts: '전체 상품 보기 →',
    exportingToLabel: '수출 중인 국가',
    moqLabel: 'MOQ · 샘플 정책',
    categoriesKicker: '카테고리',
    categoriesTitle: '취급 카테고리',
    getInTouchKicker: '문의하기',
    requestCatalogTitle: '카탈로그 요청',
    requestCatalogBody: '귀사와 원하시는 사항을 간단히 알려주시면, 영업일 기준 며칠 내로 답변드리겠습니다.',
    thankYouTitle: '감사합니다!',
    thankYouBody: '문의가 접수되었습니다. 입력해주신 이메일로 곧 연락드리겠습니다.',
    companyName: '회사명 *',
    contactName: '담당자명 *',
    email: '이메일 *',
    phone: '전화번호 (선택)',
    country: '국가 *',
    categoriesOfInterest: '관심 카테고리',
    message: '메시지 (선택) — 물량, 시장, 일정 등',
    errorRequired: '회사명, 담당자명, 이메일, 국가를 입력해 주세요.',
    errorEmail: '올바른 이메일 주소를 입력해 주세요.',
    errorGeneric: '문제가 발생했습니다. 다시 시도하시거나 이메일로 직접 문의해 주세요.',
    sending: '전송 중…',
    send: '문의 보내기',
    orEmail: '또는 이메일로 직접 문의하기',
  },
  en: {
    kicker: 'For Global Buyers',
    h1_1: 'K-Beauty, Direct From',
    h1_2: 'Our Own Portfolio',
    heroBody: (count) =>
      `Beautyground operates department-store beauty shops and an online mall in Korea, and stocks ${count} K-Beauty brands as a direct buyer and reseller — not a listing marketplace. We can offer the same products, sourced and shipped by us, to your market.`,
    stat1Label: 'Korean Beauty Brands',
    stat2Label: 'Founded · Department Store Shops',
    stat3Value: 'Direct',
    stat3Label: 'Buy & Resell — Not a Marketplace',
    brandsKicker: 'Our Brands',
    brandsTitle: 'Featured Brands',
    brandsBody: "A selection of brands we directly buy from and sell — that's Beautyground's portfolio.",
    viewAllProducts: 'View All Products →',
    exportingToLabel: 'Currently Exporting To',
    moqLabel: 'MOQ · Sample Policy',
    categoriesKicker: 'Categories',
    categoriesTitle: 'What We Carry',
    getInTouchKicker: 'Get In Touch',
    requestCatalogTitle: 'Request Our Catalog',
    requestCatalogBody:
      "Tell us a bit about your business and what you're looking for. Our team will reply within a few business days.",
    thankYouTitle: 'Thank you!',
    thankYouBody: "Your inquiry has been received. We'll be in touch at the email you provided.",
    companyName: 'Company name *',
    contactName: 'Contact name *',
    email: 'Email *',
    phone: 'Phone (optional)',
    country: 'Country *',
    categoriesOfInterest: 'Categories of interest',
    message: 'Message (optional) — volume, market, timeline, etc.',
    errorRequired: 'Please fill in company name, contact name, email, and country.',
    errorEmail: 'Please enter a valid email address.',
    errorGeneric: 'Something went wrong. Please try again or email us directly.',
    sending: 'Sending…',
    send: 'Send Inquiry',
    orEmail: 'Or email us directly at',
  },
  ja: {
    kicker: '海外バイヤー専用',
    h1_1: 'K-ビューティーを',
    h1_2: '自社ポートフォリオから直接',
    heroBody: (count) =>
      `Beautygroundは韓国で百貨店ビューティーショップとオンラインモールを運営し、${count}のK-ビューティーブランドを直接買い付け・販売するリセラーです — 単なる仲介プラットフォームではありません。同じ商品を弊社が直接調達・出荷し、貴社の市場に提供いたします。`,
    stat1Label: '韓国ビューティーブランド',
    stat2Label: '設立 · 百貨店店舗運営',
    stat3Value: '直接',
    stat3Label: '買取・再販売 — 仲介ではありません',
    brandsKicker: '取扱ブランド',
    brandsTitle: 'フィーチャーブランド',
    brandsBody: 'Beautygroundが直接買い付け・販売しているブランドの一部です。',
    viewAllProducts: 'すべての商品を見る →',
    exportingToLabel: '現在の輸出先国',
    moqLabel: 'MOQ・サンプルポリシー',
    categoriesKicker: 'カテゴリー',
    categoriesTitle: '取扱カテゴリー',
    getInTouchKicker: 'お問い合わせ',
    requestCatalogTitle: 'カタログのご請求',
    requestCatalogBody:
      '貴社の事業内容とご希望を簡単にお聞かせください。担当者より数営業日以内にご連絡いたします。',
    thankYouTitle: 'ありがとうございます！',
    thankYouBody: 'お問い合わせを受け付けました。ご入力いただいたメールアドレス宛にご連絡いたします。',
    companyName: '会社名 *',
    contactName: 'ご担当者名 *',
    email: 'メールアドレス *',
    phone: '電話番号（任意）',
    country: '国 *',
    categoriesOfInterest: '関心のあるカテゴリー',
    message: 'メッセージ（任意）— 数量、市場、スケジュールなど',
    errorRequired: '会社名、担当者名、メールアドレス、国をご入力ください。',
    errorEmail: '有効なメールアドレスを入力してください。',
    errorGeneric: '問題が発生しました。もう一度お試しいただくか、メールで直接お問い合わせください。',
    sending: '送信中…',
    send: '送信する',
    orEmail: 'またはメールで直接お問い合わせください',
  },
  zh: {
    kicker: '海外买家专区',
    h1_1: 'K-Beauty，',
    h1_2: '源自我们自有品牌组合',
    heroBody: (count) =>
      `Beautyground在韩国经营百货公司美妆专柜和线上商城，作为直接买手和分销商备货${count}K-Beauty品牌 — 而非中介平台。我们可以将同款产品直接采购、发货，供应至贵司所在市场。`,
    stat1Label: '韩国美妆品牌',
    stat2Label: '成立 · 百货公司门店运营',
    stat3Value: '直营',
    stat3Label: '买断后转售 — 非中介平台',
    brandsKicker: '合作品牌',
    brandsTitle: '精选品牌',
    brandsBody: '以下是Beautyground直接采购并销售的部分品牌。',
    viewAllProducts: '查看全部产品 →',
    exportingToLabel: '目前出口至',
    moqLabel: 'MOQ·样品政策',
    categoriesKicker: '品类',
    categoriesTitle: '我们经营的品类',
    getInTouchKicker: '联系我们',
    requestCatalogTitle: '索取产品目录',
    requestCatalogBody: '请简单介绍贵公司及需求，我们将在几个工作日内回复您。',
    thankYouTitle: '感谢您的咨询！',
    thankYouBody: '我们已收到您的咨询，将通过您提供的邮箱与您联系。',
    companyName: '公司名称 *',
    contactName: '联系人姓名 *',
    email: '电子邮箱 *',
    phone: '电话（选填）',
    country: '国家 *',
    categoriesOfInterest: '感兴趣的品类',
    message: '留言（选填）— 采购量、市场、时间安排等',
    errorRequired: '请填写公司名称、联系人姓名、电子邮箱和国家。',
    errorEmail: '请输入有效的电子邮箱地址。',
    errorGeneric: '出现问题，请重试或直接发送邮件联系我们。',
    sending: '发送中…',
    send: '发送咨询',
    orEmail: '或直接发送邮件联系我们',
  },
  es: {
    kicker: 'Para Compradores Internacionales',
    h1_1: 'K-Beauty, Directo Desde',
    h1_2: 'Nuestro Propio Portafolio',
    heroBody: (count) =>
      `Beautyground opera tiendas de belleza en grandes almacenes y una tienda online en Corea, y distribuye ${count} marcas de K-Beauty como comprador y revendedor directo — no somos una plataforma de intermediación. Podemos ofrecer los mismos productos, adquiridos y enviados por nosotros, a su mercado.`,
    stat1Label: 'Marcas de Belleza Coreanas',
    stat2Label: 'Fundada · Tiendas en Grandes Almacenes',
    stat3Value: 'Directo',
    stat3Label: 'Compra y Reventa — No Somos un Marketplace',
    brandsKicker: 'Nuestras Marcas',
    brandsTitle: 'Marcas Destacadas',
    brandsBody: 'Una selección de marcas que compramos y vendemos directamente — el portafolio de Beautyground.',
    viewAllProducts: 'Ver Todos los Productos →',
    exportingToLabel: 'Actualmente Exportando A',
    moqLabel: 'MOQ · Política de Muestras',
    categoriesKicker: 'Categorías',
    categoriesTitle: 'Lo Que Ofrecemos',
    getInTouchKicker: 'Contáctenos',
    requestCatalogTitle: 'Solicite Nuestro Catálogo',
    requestCatalogBody:
      'Cuéntenos un poco sobre su empresa y lo que busca. Nuestro equipo responderá en pocos días hábiles.',
    thankYouTitle: '¡Gracias!',
    thankYouBody: 'Hemos recibido su consulta. Nos pondremos en contacto a través del correo electrónico proporcionado.',
    companyName: 'Nombre de la empresa *',
    contactName: 'Nombre de contacto *',
    email: 'Correo electrónico *',
    phone: 'Teléfono (opcional)',
    country: 'País *',
    categoriesOfInterest: 'Categorías de interés',
    message: 'Mensaje (opcional) — volumen, mercado, plazos, etc.',
    errorRequired: 'Complete el nombre de la empresa, nombre de contacto, correo electrónico y país.',
    errorEmail: 'Ingrese una dirección de correo electrónico válida.',
    errorGeneric: 'Ocurrió un error. Inténtelo de nuevo o escríbanos directamente por correo.',
    sending: 'Enviando…',
    send: 'Enviar Consulta',
    orEmail: 'O escríbanos directamente a',
  },
}

interface CatalogItem {
  id: string
  name: string
  thumbnail_url: string | null
  category: string | null
}

interface FeaturedProduct {
  id: string
  name: string
  thumbnail_url: string | null
  export_image_urls: string[]
  export_description_en: string | null
  partner_id: string
}

interface BrandCard extends ExportBrandPublic {
  products: FeaturedProduct[]
}

interface FormState {
  company_name: string
  contact_name: string
  email: string
  phone: string
  country: string
  message: string
}

const EMPTY_FORM: FormState = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  country: '',
  message: '',
}

export default function Export() {
  const { brands } = useShopBrands()
  const [searchParams] = useSearchParams()
  const productParam = searchParams.get('product')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [brandCards, setBrandCards] = useState<BrandCard[]>([])
  const [form, setForm] = useState<FormState>(() =>
    productParam ? { ...EMPTY_FORM, message: `Re: ${productParam}\n\n` } : EMPTY_FORM
  )
  const [categories, setCategories] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [lang, setLang] = useState<Lang>(detectLang)

  const t = COPY[lang]
  const catLabel = (cat: string) => CATEGORY_I18N[lang][cat] ?? cat

  // 상품 상세페이지의 "Request Quote"로 들어온 경우 문의 폼까지 자동 스크롤.
  useEffect(() => {
    if (!productParam) return
    document.getElementById('export-inquiry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [productParam])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name,thumbnail_url,category')
        .eq('status', 'on_sale')
        .not('thumbnail_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12)
      if (!cancelled) setItems((data ?? []) as CatalogItem[])
    })()
    return () => { cancelled = true }
  }, [])

  // 브랜드가 /brand/export에서 입력한 정보(로고·영문소개·인증·대표상품)를 공개 페이지에 노출.
  // export_brand_public 뷰는 anon 조회 가능한 안전한 컬럼만 담고 있음(supabase/partners_export_pitch_en.sql).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: brandRows }, { data: productRows }] = await Promise.all([
        supabase.from('export_brand_public').select('*'),
        supabase
          .from('products')
          .select('id,name,thumbnail_url,export_image_urls,export_description_en,partner_id')
          .eq('is_export_featured', true)
          .eq('status', 'on_sale'),
      ])
      if (cancelled) return
      const products = (productRows ?? []) as FeaturedProduct[]
      const cards = ((brandRows ?? []) as ExportBrandPublic[])
        .map((b) => ({ ...b, products: products.filter((p) => p.partner_id === b.id) }))
        .filter((b) => (b.export_pitch_en?.trim() ?? '').length > 0 || b.products.length > 0)
      setBrandCards(cards)
    })()
    return () => { cancelled = true }
  }, [])

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.country.trim()) {
      setError(t.errorRequired)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError(t.errorEmail)
      return
    }

    setSubmitting(true)
    const { error: insertError } = await supabase.from('export_inquiries').insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      country: form.country.trim(),
      interested_categories: categories.length > 0 ? categories : null,
      message: form.message.trim() || null,
    })
    setSubmitting(false)

    if (insertError) {
      setError(t.errorGeneric)
      return
    }
    setSubmitted(true)
    setForm(EMPTY_FORM)
    setCategories([])
  }

  return (
    <>
      <GNB extra={<LanguageSwitcher lang={lang} setLang={setLang} />} />
      <main className="bg-paper">
        {/* Hero */}
        <section className="border-b border-rule px-6 py-20 sm:py-28 text-center">
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-5">
            {t.kicker}
          </p>
          <h1 className="text-[28px] sm:text-[40px] font-bold leading-[1.35] text-ink max-w-[760px] mx-auto">
            {t.h1_1}
            <br />
            {t.h1_2}
          </h1>
          <p className="text-ink-soft text-[15px] sm:text-[16px] leading-relaxed max-w-[600px] mx-auto mt-6">
            {t.heroBody(brands.length > 0 ? `${brands.length}+` : '')}
          </p>
        </section>

        {/* Trust stats */}
        <section className="px-6 py-14 bg-quiet">
          <div className="max-w-[880px] mx-auto grid grid-cols-2 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">{brands.length > 0 ? `${brands.length}+` : '30+'}</p>
              <p className="text-ink-soft text-[12.5px] mt-1">{t.stat1Label}</p>
            </div>
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">2022</p>
              <p className="text-ink-soft text-[12.5px] mt-1">{t.stat2Label}</p>
            </div>
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">{t.stat3Value}</p>
              <p className="text-ink-soft text-[12.5px] mt-1">{t.stat3Label}</p>
            </div>
          </div>
        </section>

        {/* Featured Brands — 브랜드가 /brand/export에서 입력한 정보 */}
        {brandCards.length > 0 && (
          <section className="max-w-[1080px] mx-auto px-6 py-20">
            <div className="flex items-end justify-between mb-2 gap-4 flex-wrap">
              <div>
                <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">{t.brandsKicker}</p>
                <h2 className="text-[24px] sm:text-[28px] font-bold text-ink">{t.brandsTitle}</h2>
              </div>
            </div>
            <p className="text-ink-soft text-[14px] mb-10">{t.brandsBody}</p>

            <div className="grid sm:grid-cols-2 gap-6">
              {brandCards.map((brand) => (
                <div key={brand.id} className="border border-rule rounded-card p-6">
                  {/* 브랜드별 수출 미니페이지(/x/:key)로 연결 — 구 상세 틀(/export/brands)은 2026-08-17 삭제 */}
                  <Link to={`/x/${brand.id}`} className="flex items-center gap-3 mb-4 group w-fit">
                    {brand.export_logo_url ? (
                      <img
                        src={brand.export_logo_url}
                        alt={brand.brand_name}
                        className="w-11 h-11 rounded-full object-cover border border-rule"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-quiet flex items-center justify-center text-[16px] font-bold text-ink-soft">
                        {brand.brand_name.charAt(0)}
                      </div>
                    )}
                    <p className="text-[16px] font-bold text-ink group-hover:underline">{brand.brand_name}</p>
                  </Link>

                  {brand.export_certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {brand.export_certifications.map((cert) => (
                        <span key={cert} className="px-2.5 py-1 rounded-pill text-[11px] border border-rule text-ink-soft">
                          {cert}
                        </span>
                      ))}
                    </div>
                  )}

                  {brand.export_pitch_en && (
                    <p className="text-[13.5px] text-ink-soft leading-relaxed mb-3">{brand.export_pitch_en}</p>
                  )}

                  {brand.export_countries && (
                    <p className="text-[12px] text-ink-faint mb-1">
                      {t.exportingToLabel}: <span className="text-ink-soft">{brand.export_countries}</span>
                    </p>
                  )}
                  {brand.export_moq_notes && (
                    <p className="text-[12px] text-ink-faint mb-4">
                      {t.moqLabel}: <span className="text-ink-soft">{brand.export_moq_notes}</span>
                    </p>
                  )}

                  {brand.products.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {brand.products.map((product) => (
                        <Link
                          key={product.id}
                          to={`/x/${brand.id}`}
                          className="rounded-card overflow-hidden border border-rule block hover:border-ink transition-colors group/card"
                        >
                          <div className="aspect-square bg-quiet overflow-hidden">
                            <img
                              src={product.export_image_urls[0] ?? product.thumbnail_url ?? ''}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="text-[12px] font-semibold text-ink leading-snug line-clamp-2 group-hover/card:underline">
                              {product.name}
                            </p>
                            {product.export_description_en && (
                              <p className="text-[11px] text-ink-faint mt-1 line-clamp-1">{product.export_description_en}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category showcase */}
        <section className="max-w-[1080px] mx-auto px-6 py-20">
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">{t.categoriesKicker}</p>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-ink mb-10">{t.categoriesTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {PRODUCT_CATEGORIES.map((cat) => (
              <div key={cat} className="border border-rule rounded-card px-4 py-5 text-center">
                <p className="text-[14px] font-semibold text-ink">{catLabel(cat)}</p>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {items.map((item) => (
                <figure key={item.id} className="rounded-card overflow-hidden border border-rule">
                  <div className="aspect-square bg-quiet overflow-hidden">
                    <img
                      src={item.thumbnail_url ?? ''}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <figcaption className="text-[12px] font-medium text-ink px-2.5 py-2 leading-snug line-clamp-2">
                    {item.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {/* Inquiry form */}
        <section id="export-inquiry-form" className="bg-quiet px-6 py-20">
          <div className="max-w-[560px] mx-auto">
            <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">{t.getInTouchKicker}</p>
            <h2 className="text-[24px] sm:text-[28px] font-bold text-ink mb-3">{t.requestCatalogTitle}</h2>
            <p className="text-ink-soft text-[14px] leading-relaxed mb-10">
              {t.requestCatalogBody}
            </p>

            {submitted ? (
              <div className="bg-paper border border-rule rounded-card px-6 py-10 text-center">
                <p className="text-[16px] font-bold text-ink mb-2">{t.thankYouTitle}</p>
                <p className="text-[14px] text-ink-soft">
                  {t.thankYouBody}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder={t.companyName}
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                  <input
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                    placeholder={t.contactName}
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t.email}
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder={t.phone}
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder={t.country}
                  className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                />

                <div>
                  <p className="text-[13px] text-ink-soft mb-2">{t.categoriesOfInterest}</p>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_CATEGORIES.map((cat) => {
                      const active = categories.includes(cat)
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3.5 py-2 rounded-pill text-[12.5px] border transition-colors ${
                            active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                          }`}
                        >
                          {catLabel(cat)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={t.message}
                  rows={4}
                  className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors resize-none"
                />

                {error && <p className="text-[13px] text-signal-red">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-paper rounded-control py-3.5 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {submitting ? t.sending : t.send}
                </button>
              </form>
            )}

            <p className="text-[12.5px] text-ink-faint mt-8 text-center">
              {t.orEmail}{' '}
              <a href={`mailto:${COMPANY_INFO.csEmail}`} className="text-ink underline">
                {COMPANY_INFO.csEmail}
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
