import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ExportBrandPublic } from '../lib/types'
import CuratorSeal from '../components/export/CuratorSeal'

// 상품 단위 수출 상세 — /x/:key 하위에 중첩된 페이지(별도 독립 라우트가 아님, 2026-08-25 확정).
// 예전에 헷갈려서 삭제한 /export/products/:id(2026-08-17)와 달리 "이 브랜드 안의 상품"이라는
// 관계가 URL·브레드크럼에 그대로 드러난다. 가격·MOQ·스펙 아코디언 없음 — 해외 바이어가
// 문의할지 말지 정하는 데 필요한 건 사진·셀링포인트·인증뿐이고, 나머지는 문의 이후에 오간다.
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

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const nl = navigator.language?.toLowerCase() ?? ''
  if (nl.startsWith('ko')) return 'ko'
  if (nl.startsWith('zh-tw') || nl.startsWith('zh-hk') || nl.startsWith('zh-hant')) return 'zh_tw'
  if (nl.startsWith('zh')) return 'zh_cn'
  if (nl.startsWith('ja')) return 'ja'
  if (nl.startsWith('ms')) return 'ms'
  if (nl.startsWith('id')) return 'id'
  if (nl.startsWith('vi')) return 'vi'
  if (nl.startsWith('th')) return 'th'
  if (nl.startsWith('ru')) return 'ru'
  return 'en'
}

interface Copy {
  sourced: string
  certs: string
  inquireBtn: string
  inquireSub: string
  notFoundTitle: string
  notFoundBody: string
  notFoundCta: string
}

const COPY: Record<Lang, Copy> = {
  en: { sourced: 'Directly Sourced by Beautyground', certs: 'Certifications', inquireBtn: 'Inquire About This Product', inquireSub: 'Pricing, MOQ and samples are shared after contact.', notFoundTitle: 'This product page is not available.', notFoundBody: 'It opens once the brand features this product for export.', notFoundCta: 'Browse the export catalog' },
  zh_tw: { sourced: 'Beautyground 直接採購', certs: '認證', inquireBtn: '詢問此商品', inquireSub: '價格、MOQ、樣品資訊將於聯繫後提供。', notFoundTitle: '此商品頁面尚未開放。', notFoundBody: '品牌將此商品設為出口代表商品後即會開放。', notFoundCta: '瀏覽出口型錄' },
  zh_cn: { sourced: 'Beautyground 直接采购', certs: '认证', inquireBtn: '咨询此产品', inquireSub: '价格、MOQ、样品信息将在联系后提供。', notFoundTitle: '此产品页面尚未开放。', notFoundBody: '品牌将此产品设为出口代表产品后即会开放。', notFoundCta: '浏览出口目录' },
  ja: { sourced: 'Beautygroundが直接買い付け', certs: '認証', inquireBtn: 'この商品について問い合わせる', inquireSub: '価格・MOQ・サンプルはお問い合わせ後にご案内します。', notFoundTitle: 'この商品ページはまだ公開されていません。', notFoundBody: 'ブランドがこの商品を輸出代表商品に設定すると開設されます。', notFoundCta: '輸出カタログを見る' },
  ms: { sourced: 'Dibeli Terus oleh Beautyground', certs: 'Pensijilan', inquireBtn: 'Tanya Tentang Produk Ini', inquireSub: 'Harga, MOQ dan sampel dikongsi selepas dihubungi.', notFoundTitle: 'Halaman produk ini belum dibuka.', notFoundBody: 'Ia dibuka apabila jenama menjadikan produk ini produk eksport wakil.', notFoundCta: 'Lihat katalog eksport' },
  id: { sourced: 'Dibeli Langsung oleh Beautyground', certs: 'Sertifikasi', inquireBtn: 'Tanya Tentang Produk Ini', inquireSub: 'Harga, MOQ, dan sampel diinformasikan setelah kontak.', notFoundTitle: 'Halaman produk ini belum tersedia.', notFoundBody: 'Halaman terbuka setelah brand menjadikan produk ini produk ekspor andalan.', notFoundCta: 'Lihat katalog ekspor' },
  vi: { sourced: 'Beautyground Mua Trực Tiếp', certs: 'Chứng nhận', inquireBtn: 'Hỏi Về Sản Phẩm Này', inquireSub: 'Giá, MOQ và mẫu sẽ được chia sẻ sau khi liên hệ.', notFoundTitle: 'Trang sản phẩm này chưa mở.', notFoundBody: 'Trang sẽ mở khi thương hiệu chọn đây là sản phẩm xuất khẩu tiêu biểu.', notFoundCta: 'Xem danh mục xuất khẩu' },
  th: { sourced: 'จัดหาโดย Beautyground โดยตรง', certs: 'การรับรอง', inquireBtn: 'สอบถามเกี่ยวกับสินค้านี้', inquireSub: 'ราคา MOQ และตัวอย่างจะแจ้งหลังการติดต่อ', notFoundTitle: 'หน้าสินค้านี้ยังไม่เปิดให้ใช้งาน', notFoundBody: 'จะเปิดเมื่อแบรนด์ตั้งค่าสินค้านี้เป็นสินค้าส่งออกหลัก', notFoundCta: 'ดูแคตตาล็อกส่งออก' },
  ru: { sourced: 'Прямая закупка Beautyground', certs: 'Сертификаты', inquireBtn: 'Узнать об этом товаре', inquireSub: 'Цена, MOQ и образцы — после связи с нами.', notFoundTitle: 'Страница товара недоступна.', notFoundBody: 'Она откроется, когда бренд отметит этот товар как экспортный.', notFoundCta: 'Смотреть экспортный каталог' },
  ko: { sourced: '뷰티그라운드 직접 매입', certs: '인증', inquireBtn: '이 제품 문의하기', inquireSub: '가격·MOQ·샘플은 문의 후 안내드립니다.', notFoundTitle: '아직 열리지 않은 상품 페이지입니다.', notFoundBody: '브랜드가 이 상품을 수출 대표상품으로 지정하면 열립니다.', notFoundCta: '수출 카탈로그 보기' },
}

interface I18nField { [lang: string]: string }
interface ProductRow {
  id: string
  name: string
  thumbnail_url: string | null
  gallery_images: string[] | null
  detail_images: string[] | null
  description: string | null
  export_image_urls: string[] | null
  export_description_en: string | null
  is_export_featured: boolean
  status: string
  partner_id: string
  export_i18n?: { name?: I18nField; desc?: I18nField } | null
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[\s\-_]/g, '')
const isRegistered = (b: ExportBrandPublic) => (b.export_pitch_en?.trim() ?? '').length > 0

export default function ExportProduct() {
  const { key = '', productId = '' } = useParams()
  const navigate = useNavigate()
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
        .select('id,name,thumbnail_url,gallery_images,detail_images,description,export_image_urls,export_description_en,is_export_featured,status,partner_id,export_i18n')
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

  const certs = (brand?.export_certifications ?? []).filter(Boolean)

  useEffect(() => {
    if (product) document.title = `${name} — ${brand?.brand_name ?? ''} | BEAUTYGROUND EXPORT`
  }, [product, name, brand])

  if (brand === undefined || product === undefined) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-[12px] tracking-[0.2em] text-[#B9B4A8]">BEAUTYGROUND EXPORT</div>
  }
  if (!brand || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <CuratorSeal size={72} />
        <p className="font-serif text-[19px] text-[#16202F] leading-snug">{t.notFoundTitle}</p>
        <p className="text-[13px] text-[#8A8577] leading-relaxed max-w-[300px]">{t.notFoundBody}</p>
        <Link to="/export" className="mt-3 text-[12px] tracking-[0.1em] text-[#16202F] border-b border-[#16202F] pb-0.5 hover:text-[#E53E3E] hover:border-[#E53E3E] transition-colors">
          {t.notFoundCta} →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex justify-center">
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-[0_0_50px_rgba(22,32,47,0.06)] flex flex-col">
        {/* 상단: 뒤로가기 + 브레드크럼 + 언어 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => navigate(-1)} aria-label="이전 페이지로" className="text-[#8A8577] hover:text-[#16202F] transition-colors text-[15px] shrink-0">←</button>
            <p className="text-[10.5px] tracking-[0.12em] text-[#8A8577] truncate">
              <Link to="/export" className="hover:text-[#16202F] transition-colors">Export Catalog</Link>
              <span className="mx-1.5 text-[#D8D4C9]">/</span>
              <Link to={`/x/${brand.id}`} className="hover:text-[#16202F] transition-colors">{brand.brand_name}</Link>
            </p>
          </div>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setLangOpen((v) => !v)} className="text-[11px] tracking-[0.08em] text-[#8A8577] border border-[#E6E3DC] px-3 py-1.5 hover:border-[#16202F] hover:text-[#16202F] transition-colors">
              {LANGS.find((l) => l.code === lang)?.label} ▾
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 max-h-[300px] overflow-y-auto bg-white border border-[#E6E3DC] shadow-[0_8px_24px_rgba(22,32,47,0.08)] z-40">
                  {LANGS.map((l) => (
                    <button key={l.code} type="button" onClick={() => { setLang(l.code); setLangOpen(false) }}
                      className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${l.code === lang ? 'text-[#16202F] font-bold bg-[#FAF9F6]' : 'text-[#8A8577] hover:bg-[#FAF9F6]'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mx-6 h-px bg-[#16202F]" />

        {/* 갤러리 — 온라인몰과 동일 규격(aspect-square·object-contain), 자르지 않고 전체 노출 */}
        <div className="px-6 pt-6">
          <div className="aspect-square bg-[#FAF9F6] border border-[#E6E3DC] overflow-hidden">
            {images.length > 0 && (
              <img src={images[Math.min(activeImg, images.length - 1)]} alt={name} className="w-full h-full object-contain" loading="eager" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((url, i) => (
                <button key={url + i} type="button" onClick={() => setActiveImg(i)}
                  className={`w-14 h-14 overflow-hidden border-2 shrink-0 ${i === activeImg ? 'border-[#16202F]' : 'border-[#E6E3DC]'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 브랜드 태그 + 상품명 + 셀링포인트 */}
        <div className="px-6 pt-6">
          <p className="text-[10.5px] tracking-[0.12em] uppercase text-[#8A8577] mb-2">
            <span className="text-[#16202F] font-bold">{brand.brand_name}</span> · {t.sourced}
          </p>
          <h1 className="font-serif text-[21px] leading-[1.3] text-[#16202F] break-keep mb-3">{name}</h1>
          {descText && <p className="text-[13px] text-[#5A564B] leading-[1.8]">{descText}</p>}
        </div>

        {/* 인증 */}
        {certs.length > 0 && (
          <section className="px-6 pt-7">
            <p className="text-[10.5px] tracking-[0.28em] uppercase text-[#111111] pb-2 border-b border-[#111111]">{t.certs}</p>
            <p className="pt-3 text-[12.5px] text-[#16202F] leading-[2]">
              {certs.map((c, i) => (
                <span key={c}>{c}{i < certs.length - 1 && <span className="mx-2.5 text-[#D8D4C9]">·</span>}</span>
              ))}
            </p>
          </section>
        )}

        <div className="flex-1 min-h-8" />

        {/* Inquire CTA — 가격·MOQ 없이 문의로만 연결, 기존 /export 문의폼 프리필 재사용 */}
        <div className="sticky bottom-0 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-white via-white/60 to-transparent">
          <Link
            to={`/export?product=${encodeURIComponent(name)}`}
            className="block text-center rounded-full py-3.5 text-[13px] tracking-[0.06em] text-white bg-[#E53E3E]/90 border border-white/25 backdrop-blur-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_22px_rgba(229,62,62,0.28)] hover:bg-[#E53E3E] active:opacity-90 transition-colors"
          >
            {t.inquireBtn}
          </Link>
          <p className="text-center text-[9.5px] text-[#B9B4A8] mt-2.5">{t.inquireSub}</p>
        </div>
      </div>
    </div>
  )
}
