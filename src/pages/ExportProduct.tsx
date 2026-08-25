import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ExportBrandPublic } from '../lib/types'
import { CATEGORY_I18N } from '../lib/exportI18n'

// 상품 단위 수출 상세 — /x/:key 하위에 중첩된 페이지(별도 독립 라우트가 아님, 2026-08-25 확정).
// 대표님 승인 시안(claude.ai/code/artifact/16f3e47e...)의 구조를 그대로 따른다 —
// 갤러리(aspect-square·object-contain·호버확대) + Key Highlights/Features & Specifications/
// Item Details 3개 아코디언(항상 노출, 실데이터 없으면 "to be confirmed with brand") +
// Inquire 박스. 가격·MOQ는 없음 — 문의로만 연결.
// 사진·설명은 수출용으로 새로 안 받고 온라인몰 products 테이블 데이터를 그대로 재사용한다.

type Lang = 'en' | 'zh_tw' | 'zh_cn' | 'ja' | 'ms' | 'id' | 'vi' | 'th' | 'ru' | 'ko'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh_tw', label: '繁體中文' },
  { code: 'zh_cn', label: '简体中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'ru', label: 'Русский' },
  { code: 'ko', label: '한국어' },
]

// 해외 바이어 전용 페이지라 브라우저 언어 자동감지 없이 항상 영어로 시작(2026-08-26 확정).
function detectLang(): Lang {
  return 'en'
}

const TBC = 'to be confirmed with brand'

interface Copy {
  sourced: string
  highlights: string
  features: string
  itemDetails: string
  format: string
  netContents: string
  keyIngredients: string
  certifications: string
  category: string
  countryOfOrigin: string
  madeInKorea: string
  shelfLife: string
  exportPackaging: string
  inquireLead: string
  inquireSub: string
  inquireBtn: string
  inquireMicro: string
  soldAtDeptStore: string
  soldByBg: string
  notFoundTitle: string
  notFoundBody: string
  notFoundCta: string
}

const COPY: Record<Lang, Copy> = {
  en: { sourced: 'Directly Sourced by Beautyground', highlights: 'Key Highlights', features: 'Features & Specifications', itemDetails: 'Item Details', format: 'Format', netContents: 'Net contents', keyIngredients: 'Key ingredients', certifications: 'Certifications', category: 'Category', countryOfOrigin: 'Country of origin', madeInKorea: 'Made in Korea', shelfLife: 'Shelf life', exportPackaging: 'Export packaging', inquireLead: 'Interested in stocking this?', inquireSub: 'Pricing, MOQ and sample options are shared after contact.', inquireBtn: 'Inquire About This Product', inquireMicro: 'We usually reply within 2 business days', soldAtDeptStore: 'Currently sold at Korean department store counters', soldByBg: 'Sourced & shipped directly by Beautyground — not a marketplace listing', notFoundTitle: 'This product page is not available.', notFoundBody: 'It opens once the brand features this product for export.', notFoundCta: 'Browse the export catalog' },
  zh_tw: { sourced: 'Beautyground 直接採購', highlights: '產品亮點', features: '功能與規格', itemDetails: '商品資訊', format: '型態', netContents: '內容量', keyIngredients: '主要成分', certifications: '認證', category: '類別', countryOfOrigin: '原產地', madeInKorea: '韓國製造', shelfLife: '保存期限', exportPackaging: '外銷包裝', inquireLead: '有興趣進貨嗎？', inquireSub: '聯繫後將提供價格、MOQ 及樣品資訊。', inquireBtn: '詢問此商品', inquireMicro: '我們通常在2個工作天內回覆', soldAtDeptStore: '目前於韓國百貨公司專櫃販售中', soldByBg: '由 Beautyground 直接採購並出貨 — 並非中介平台上架', notFoundTitle: '此商品頁面尚未開放。', notFoundBody: '品牌將此商品設為出口代表商品後即會開放。', notFoundCta: '瀏覽出口型錄' },
  zh_cn: { sourced: 'Beautyground 直接采购', highlights: '产品亮点', features: '功能与规格', itemDetails: '商品信息', format: '型态', netContents: '内容量', keyIngredients: '主要成分', certifications: '认证', category: '类别', countryOfOrigin: '原产地', madeInKorea: '韩国制造', shelfLife: '保质期', exportPackaging: '出口包装', inquireLead: '有兴趣进货吗？', inquireSub: '联系后将提供价格、MOQ 及样品信息。', inquireBtn: '咨询此产品', inquireMicro: '我们通常在2个工作日内回复', soldAtDeptStore: '目前在韩国百货公司专柜销售中', soldByBg: '由 Beautyground 直接采购并发货 — 并非中介平台上架', notFoundTitle: '此产品页面尚未开放。', notFoundBody: '品牌将此产品设为出口代表产品后即会开放。', notFoundCta: '浏览出口目录' },
  ja: { sourced: 'Beautygroundが直接買い付け', highlights: 'ハイライト', features: '機能・仕様', itemDetails: '商品詳細', format: '形態', netContents: '内容量', keyIngredients: '主要成分', certifications: '認証', category: 'カテゴリー', countryOfOrigin: '原産国', madeInKorea: '韓国製', shelfLife: '使用期限', exportPackaging: '輸出用パッケージ', inquireLead: 'この商品にご興味がありますか？', inquireSub: '価格・MOQ・サンプルはお問い合わせ後にご案内します。', inquireBtn: 'この商品について問い合わせる', inquireMicro: '通常2営業日以内に返信いたします', soldAtDeptStore: '現在韓国の百貨店カウンターで販売中', soldByBg: 'Beautygroundが直接買い付け・出荷 — 仲介プラットフォームへの掲載ではありません', notFoundTitle: 'この商品ページはまだ公開されていません。', notFoundBody: 'ブランドがこの商品を輸出代表商品に設定すると開設されます。', notFoundCta: '輸出カタログを見る' },
  ms: { sourced: 'Dibeli Terus oleh Beautyground', highlights: 'Sorotan Utama', features: 'Ciri & Spesifikasi', itemDetails: 'Butiran Produk', format: 'Format', netContents: 'Kandungan bersih', keyIngredients: 'Bahan utama', certifications: 'Pensijilan', category: 'Kategori', countryOfOrigin: 'Negara asal', madeInKorea: 'Dibuat di Korea', shelfLife: 'Jangka hayat', exportPackaging: 'Pembungkusan eksport', inquireLead: 'Berminat menjual produk ini?', inquireSub: 'Harga, MOQ dan sampel dikongsi selepas dihubungi.', inquireBtn: 'Tanya Tentang Produk Ini', inquireMicro: 'Kami biasanya membalas dalam 2 hari bekerja', soldAtDeptStore: 'Kini dijual di kaunter gedung serbaneka Korea', soldByBg: 'Dibeli & dihantar terus oleh Beautyground — bukan penyenaraian marketplace', notFoundTitle: 'Halaman produk ini belum dibuka.', notFoundBody: 'Ia dibuka apabila jenama menjadikan produk ini produk eksport wakil.', notFoundCta: 'Lihat katalog eksport' },
  id: { sourced: 'Dibeli Langsung oleh Beautyground', highlights: 'Sorotan Utama', features: 'Fitur & Spesifikasi', itemDetails: 'Detail Produk', format: 'Format', netContents: 'Isi bersih', keyIngredients: 'Bahan utama', certifications: 'Sertifikasi', category: 'Kategori', countryOfOrigin: 'Negara asal', madeInKorea: 'Dibuat di Korea', shelfLife: 'Masa simpan', exportPackaging: 'Kemasan ekspor', inquireLead: 'Tertarik untuk menjual produk ini?', inquireSub: 'Harga, MOQ, dan sampel diinformasikan setelah kontak.', inquireBtn: 'Tanya Tentang Produk Ini', inquireMicro: 'Kami biasanya membalas dalam 2 hari kerja', soldAtDeptStore: 'Saat ini dijual di konter department store Korea', soldByBg: 'Dibeli & dikirim langsung oleh Beautyground — bukan listing marketplace', notFoundTitle: 'Halaman produk ini belum tersedia.', notFoundBody: 'Halaman terbuka setelah brand menjadikan produk ini produk ekspor andalan.', notFoundCta: 'Lihat katalog ekspor' },
  vi: { sourced: 'Beautyground Mua Trực Tiếp', highlights: 'Điểm Nổi Bật', features: 'Tính Năng & Thông Số', itemDetails: 'Chi Tiết Sản Phẩm', format: 'Định dạng', netContents: 'Dung tích', keyIngredients: 'Thành phần chính', certifications: 'Chứng nhận', category: 'Danh mục', countryOfOrigin: 'Xuất xứ', madeInKorea: 'Sản xuất tại Hàn Quốc', shelfLife: 'Hạn sử dụng', exportPackaging: 'Đóng gói xuất khẩu', inquireLead: 'Quan tâm đến việc kinh doanh sản phẩm này?', inquireSub: 'Giá, MOQ và mẫu sẽ được chia sẻ sau khi liên hệ.', inquireBtn: 'Hỏi Về Sản Phẩm Này', inquireMicro: 'Chúng tôi thường phản hồi trong 2 ngày làm việc', soldAtDeptStore: 'Hiện đang bán tại quầy trung tâm thương mại Hàn Quốc', soldByBg: 'Beautyground trực tiếp mua và vận chuyển — không phải gian hàng trung gian', notFoundTitle: 'Trang sản phẩm này chưa mở.', notFoundBody: 'Trang sẽ mở khi thương hiệu chọn đây là sản phẩm xuất khẩu tiêu biểu.', notFoundCta: 'Xem danh mục xuất khẩu' },
  th: { sourced: 'จัดหาโดย Beautyground โดยตรง', highlights: 'จุดเด่น', features: 'คุณสมบัติและสเปค', itemDetails: 'รายละเอียดสินค้า', format: 'รูปแบบ', netContents: 'ปริมาณสุทธิ', keyIngredients: 'ส่วนผสมหลัก', certifications: 'การรับรอง', category: 'หมวดหมู่', countryOfOrigin: 'ประเทศต้นกำเนิด', madeInKorea: 'ผลิตในเกาหลี', shelfLife: 'อายุการเก็บรักษา', exportPackaging: 'บรรจุภัณฑ์ส่งออก', inquireLead: 'สนใจนำสินค้านี้ไปจำหน่ายหรือไม่?', inquireSub: 'ราคา MOQ และตัวอย่างจะแจ้งหลังการติดต่อ', inquireBtn: 'สอบถามเกี่ยวกับสินค้านี้', inquireMicro: 'เรามักจะตอบกลับภายใน 2 วันทำการ', soldAtDeptStore: 'ปัจจุบันวางจำหน่ายที่เคาน์เตอร์ห้างสรรพสินค้าในเกาหลี', soldByBg: 'จัดหาและจัดส่งโดย Beautyground โดยตรง — ไม่ใช่การลงขายผ่านตลาดกลาง', notFoundTitle: 'หน้าสินค้านี้ยังไม่เปิดให้ใช้งาน', notFoundBody: 'จะเปิดเมื่อแบรนด์ตั้งค่าสินค้านี้เป็นสินค้าส่งออกหลัก', notFoundCta: 'ดูแคตตาล็อกส่งออก' },
  ru: { sourced: 'Прямая закупка Beautyground', highlights: 'Основные преимущества', features: 'Характеристики', itemDetails: 'Информация о товаре', format: 'Формат', netContents: 'Объём', keyIngredients: 'Ключевые ингредиенты', certifications: 'Сертификаты', category: 'Категория', countryOfOrigin: 'Страна происхождения', madeInKorea: 'Сделано в Корее', shelfLife: 'Срок годности', exportPackaging: 'Экспортная упаковка', inquireLead: 'Хотите продавать этот товар?', inquireSub: 'Цена, MOQ и образцы — после связи с нами.', inquireBtn: 'Узнать об этом товаре', inquireMicro: 'Обычно мы отвечаем в течение 2 рабочих дней', soldAtDeptStore: 'Сейчас продаётся в корейских универмагах', soldByBg: 'Закупка и доставка напрямую Beautyground — не маркетплейс', notFoundTitle: 'Страница товара недоступна.', notFoundBody: 'Она откроется, когда бренд отметит этот товар как экспортный.', notFoundCta: 'Смотреть экспортный каталог' },
  ko: { sourced: '뷰티그라운드 직접 매입', highlights: '주요 하이라이트', features: '기능·사양', itemDetails: '상품 정보', format: '형태', netContents: '내용량', keyIngredients: '주요 성분', certifications: '인증', category: '카테고리', countryOfOrigin: '원산지', madeInKorea: '한국산', shelfLife: '유통기한', exportPackaging: '수출 포장', inquireLead: '이 제품 입점에 관심 있으신가요?', inquireSub: '가격·MOQ·샘플은 문의 후 안내드립니다.', inquireBtn: '이 제품 문의하기', inquireMicro: '영업일 기준 2일 내 회신드립니다', soldAtDeptStore: '현재 한국 백화점 매장에서 판매 중', soldByBg: '뷰티그라운드가 직접 매입·배송 — 중개 플랫폼 입점이 아님', notFoundTitle: '아직 열리지 않은 상품 페이지입니다.', notFoundBody: '브랜드가 이 상품을 수출 대표상품으로 지정하면 열립니다.', notFoundCta: '수출 카탈로그 보기' },
}

interface I18nField { [lang: string]: string }
interface ProductRow {
  id: string
  name: string
  thumbnail_url: string | null
  gallery_images: string[] | null
  detail_images: string[] | null
  description: string | null
  category: string | null
  export_image_urls: string[] | null
  export_description_en: string | null
  is_export_featured: boolean
  status: string
  partner_id: string
  export_i18n?: { name?: I18nField; desc?: I18nField } | null
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[\s\-_]/g, '')
const isRegistered = (b: ExportBrandPublic) => (b.export_pitch_en?.trim() ?? '').length > 0

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-signal-red shrink-0 mt-0.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      className={`text-ink-faint transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function AccordionItem({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="border-b border-rule">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between py-4 text-[13.5px] font-bold text-ink text-left">
        {title}
        <Chevron open={open} />
      </button>
      {open && <div className="pb-4 text-[13.5px] text-ink-soft leading-relaxed">{children}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string; todo?: boolean }) {
  return (
    <div className="contents">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={`m-0 ${value === TBC ? 'text-ink-faint italic' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

export default function ExportProduct() {
  const { key = '', productId = '' } = useParams()
  const [brand, setBrand] = useState<ExportBrandPublic | null | undefined>(undefined)
  const [product, setProduct] = useState<ProductRow | null | undefined>(undefined)
  const [activeImg, setActiveImg] = useState(0)
  const [lang, setLang] = useState<Lang>(detectLang)
  const [langOpen, setLangOpen] = useState(false)
  const t = COPY[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: rows } = await supabase.from('export_brand_public').select('*')
      if (cancelled) return
      const list = (rows ?? []) as ExportBrandPublic[]
      const decoded = norm(decodeURIComponent(key))
      const foundBrand = list.find((b) => b.id === key) ?? list.find((b) => norm(b.brand_name) === decoded) ?? null
      if (!foundBrand || !isRegistered(foundBrand)) {
        setBrand(null)
        setProduct(null)
        return
      }
      setBrand(foundBrand)

      const { data: prodRow } = await supabase
        .from('products')
        .select('id,name,thumbnail_url,gallery_images,detail_images,description,category,export_image_urls,export_description_en,is_export_featured,status,partner_id,export_i18n')
        .eq('id', productId)
        .eq('partner_id', foundBrand.id)
        .in('status', ['on_sale', 'hidden'])
        .eq('is_export_featured', true)
        .maybeSingle()
      if (cancelled) return
      setProduct((prodRow as ProductRow | null) ?? null)
    })()
    return () => { cancelled = true }
  }, [key, productId])

  const images = useMemo(() => {
    if (!product) return []
    const list = product.export_image_urls && product.export_image_urls.length > 0
      ? product.export_image_urls
      : [product.thumbnail_url, ...(product.gallery_images ?? []), ...(product.detail_images ?? [])]
    return Array.from(new Set(list.filter((u): u is string => !!u)))
  }, [product])

  const name = product?.export_i18n?.name?.[lang]?.trim() || product?.export_i18n?.name?.en?.trim() || product?.name || ''
  const descText = product
    ? (product.export_i18n?.desc?.[lang]?.trim()
      || product.export_i18n?.desc?.en?.trim()
      || product.export_description_en?.trim()
      || product.description?.trim()
      || '')
    : ''
  const categoryLabel = product?.category ? (CATEGORY_I18N.en[product.category] ?? product.category) : ''
  const certs = (brand?.export_certifications ?? []).filter(Boolean)

  useEffect(() => {
    if (product) document.title = `${name} — ${brand?.brand_name ?? ''} | BEAUTYGROUND EXPORT`
  }, [product, name, brand])

  if (brand === undefined || product === undefined) {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-[12px] tracking-[0.2em] text-ink-faint">BEAUTYGROUND EXPORT</div>
  }
  if (!brand || !product) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-[19px] font-bold text-ink leading-snug">{t.notFoundTitle}</p>
        <p className="text-[13px] text-ink-soft leading-relaxed max-w-[300px]">{t.notFoundBody}</p>
        <Link to="/export" className="mt-3 text-[12px] tracking-[0.1em] text-ink border-b border-ink pb-0.5 hover:text-signal-red hover:border-signal-red transition-colors">
          {t.notFoundCta} →
        </Link>
      </div>
    )
  }

  // Key Highlights — 실데이터(설명·실적)만, 없으면 정직하게 TBC
  const highlightBullets = [
    descText || TBC,
    t.soldAtDeptStore,
    t.soldByBg,
  ]

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1100px] mx-auto px-6 pt-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[12px] text-ink-faint truncate">
          <Link to="/export" className="hover:text-ink transition-colors">Export Catalog</Link>
          <span className="mx-1.5">/</span>
          <Link to={`/x/${brand.id}`} className="hover:text-ink transition-colors">{brand.brand_name}</Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-soft">{name}</span>
        </p>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setLangOpen((v) => !v)} className="text-[11px] tracking-[0.08em] text-ink-faint border border-rule px-3 py-1.5 hover:border-ink hover:text-ink transition-colors rounded-control">
            {LANGS.find((l) => l.code === lang)?.label} ▾
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 mt-1 w-44 max-h-[300px] overflow-y-auto bg-paper border border-rule rounded-control shadow-lg z-40">
                {LANGS.map((l) => (
                  <button key={l.code} type="button" onClick={() => { setLang(l.code); setLangOpen(false) }}
                    className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${l.code === lang ? 'text-ink font-bold bg-quiet' : 'text-ink-faint hover:bg-quiet'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pt-5 pb-20 grid md:grid-cols-[1.15fr_0.85fr] gap-14">
        {/* 갤러리 — DesktopProductDetail.tsx 표준(aspect-square·object-contain), 호버 확대 */}
        <div className="max-w-[520px]">
          <div className="aspect-square bg-quiet overflow-hidden group cursor-zoom-in">
            {images.length > 0 && (
              <img
                src={images[Math.min(activeImg, images.length - 1)]}
                alt={name}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.15]"
                loading="eager"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((url, i) => (
                <button key={url + i} type="button" onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 overflow-hidden border-2 shrink-0 ${i === activeImg ? 'border-ink' : 'border-rule'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 패널 */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-red shrink-0" />
            <span className="text-[12.5px] font-bold text-ink-soft">{brand.brand_name}</span>
            <span className="text-[11px] text-ink-faint">· {t.sourced}</span>
          </div>
          <h1 className="text-[24px] font-extrabold text-ink leading-[1.3] tracking-tight mb-2">{name}</h1>
          {categoryLabel && <p className="text-[13px] text-ink-faint mb-5">{categoryLabel}</p>}

          <div className="border-t border-rule">
            <AccordionItem title={t.highlights} defaultOpen>
              <ul className="space-y-2.5">
                {highlightBullets.map((b, i) => (
                  <li key={i} className={`flex gap-2.5 ${b === TBC ? 'text-ink-faint italic' : ''}`}>
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </AccordionItem>

            <AccordionItem title={t.features}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <Row label={t.format} value={categoryLabel || TBC} />
                <Row label={t.netContents} value={TBC} />
                <Row label={t.keyIngredients} value={TBC} />
                <Row label={t.certifications} value={certs.length > 0 ? certs.join(' · ') : TBC} />
              </dl>
            </AccordionItem>

            <AccordionItem title={t.itemDetails}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <Row label={t.category} value={categoryLabel || TBC} />
                <Row label={t.countryOfOrigin} value={t.madeInKorea} />
                <Row label={t.shelfLife} value={TBC} />
                <Row label={t.exportPackaging} value={TBC} />
              </dl>
            </AccordionItem>
          </div>

          <div className="bg-quiet border border-rule rounded-card p-5 mt-6">
            <p className="text-[13.5px] font-bold text-ink mb-1">{t.inquireLead}</p>
            <p className="text-[12px] text-ink-soft mb-4">{t.inquireSub}</p>
            <Link
              to={`/export?product=${encodeURIComponent(name)}`}
              className="block text-center bg-ink text-paper rounded-control py-3.5 text-[14px] font-semibold hover:opacity-90 transition-opacity"
            >
              {t.inquireBtn}
            </Link>
            <p className="text-[11px] text-ink-faint mt-3 text-center">{t.inquireMicro}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
