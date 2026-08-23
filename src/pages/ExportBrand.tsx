import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ExportBrandPublic } from '../lib/types'
import CuratorSeal from '../components/export/CuratorSeal'

// 브랜드별 수출 미니페이지(/x/:key) — 해외 바이어·소비자에게 링크/QR 하나로 전달하는 모바일 원페이지.
// 디자인: "무역 라인시트(line sheet)" — 화이트 지면, 세리프 브랜드명, 헤어라인 괘선, 스펙 테이블.
// 시그니처는 CURATED BY BEAUTYGROUND 원형 인장 하나. 장식·이모지·그라데이션 없음 (2026-08-17 대표님 방향).
//
// ⚠️ 원칙: 우리는 틀만 제공한다. 브랜드사가 직접 가입해 수출 정보를 채운 경우에만 열린다.
// 언어: 기본 영어, 우상단 버튼으로 10개 언어 — 콘텐츠는 저장된 번역(export_pitch_i18n/export_i18n)을 읽는다.

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
  products: string
  certs: string
  proven: string
  provenRows: [string, string][] // [라벨, 값] — 라인시트 스펙 테이블
  priceOnRequest: string
  retail: string
  shopBtn: string
  wholesaleBtn: string
  wholesaleSub: string
  ctaSub: string
  notFoundTitle: string
  notFoundBody: string
  notFoundCta: string
}

const mkProven = (retailV: string, onlineV: string, tradeV: string, labels: [string, string, string]): [string, string][] => [
  [labels[0], retailV],
  [labels[1], onlineV],
  [labels[2], tradeV],
]

const COPY: Record<Lang, Copy> = {
  en: {
    products: 'Products', certs: 'Certifications', proven: 'Proven in Korea',
    provenRows: mkProven('AK Department Store — on display', 'beautyground.co.kr — selling now', 'Direct buy & resell by Beautyground', ['Retail', 'Online', 'Trade']),
    priceOnRequest: 'Wholesale on request', retail: 'Korea retail',
    shopBtn: 'Shop retail', wholesaleBtn: 'Wholesale inquiry', wholesaleSub: 'Reply within 24h',
    ctaSub: 'Retail and export are both handled by Beautyground, Seoul.',
    notFoundTitle: 'This brand page is not open yet.',
    notFoundBody: 'It opens when the brand completes its export profile with Beautyground.',
    notFoundCta: 'Browse the export catalog',
  },
  zh_tw: {
    products: '產品', certs: '認證', proven: '韓國實績',
    provenRows: mkProven('AK百貨 — 門市陳列中', 'beautyground.co.kr — 販售中', 'Beautyground 直接買斷再販售', ['零售', '線上', '交易']),
    priceOnRequest: '批發價格請洽詢', retail: '韓國零售價',
    shopBtn: '前往選購', wholesaleBtn: '批發洽詢', wholesaleSub: '24小時內回覆',
    ctaSub: '零售與出口皆由首爾 Beautyground 營運。',
    notFoundTitle: '此品牌頁面尚未開設。',
    notFoundBody: '品牌在 Beautyground 完成出口資料登錄後即會開放。',
    notFoundCta: '瀏覽出口型錄',
  },
  zh_cn: {
    products: '产品', certs: '认证', proven: '韩国实绩',
    provenRows: mkProven('AK百货 — 门店陈列中', 'beautyground.co.kr — 在售', 'Beautyground 直接买断再销售', ['零售', '线上', '交易']),
    priceOnRequest: '批发价格请咨询', retail: '韩国零售价',
    shopBtn: '前往选购', wholesaleBtn: '批发咨询', wholesaleSub: '24小时内回复',
    ctaSub: '零售与出口均由首尔 Beautyground 运营。',
    notFoundTitle: '此品牌页面尚未开设。',
    notFoundBody: '品牌在 Beautyground 完成出口资料登记后即会开放。',
    notFoundCta: '浏览出口目录',
  },
  ja: {
    products: '商品', certs: '認証', proven: '韓国での実績',
    provenRows: mkProven('AK百貨店 — 店頭陳列中', 'beautyground.co.kr — 販売中', 'Beautyground が直接買付・再販売', ['小売', 'オンライン', '取引']),
    priceOnRequest: '卸価格はお問い合わせください', retail: '韓国小売価格',
    shopBtn: '購入ページへ', wholesaleBtn: '卸売のお問い合わせ', wholesaleSub: '24時間以内に返信',
    ctaSub: '小売・輸出ともにソウルのBeautygroundが運営しています。',
    notFoundTitle: 'このブランドページはまだ開設されていません。',
    notFoundBody: 'ブランドがBeautygroundでの輸出プロフィール登録を完了すると開設されます。',
    notFoundCta: '輸出カタログを見る',
  },
  ms: {
    products: 'Produk', certs: 'Pensijilan', proven: 'Terbukti di Korea',
    provenRows: mkProven('Gedung AK — dipamerkan', 'beautyground.co.kr — dijual sekarang', 'Belian terus & jualan semula oleh Beautyground', ['Runcit', 'Dalam talian', 'Dagangan']),
    priceOnRequest: 'Harga borong atas permintaan', retail: 'Runcit Korea',
    shopBtn: 'Beli runcit', wholesaleBtn: 'Pertanyaan borong', wholesaleSub: 'Balas dalam 24 jam',
    ctaSub: 'Runcit dan eksport dikendalikan oleh Beautyground, Seoul.',
    notFoundTitle: 'Halaman jenama ini belum dibuka.',
    notFoundBody: 'Ia dibuka apabila jenama melengkapkan profil eksport dengan Beautyground.',
    notFoundCta: 'Lihat katalog eksport',
  },
  id: {
    products: 'Produk', certs: 'Sertifikasi', proven: 'Terbukti di Korea',
    provenRows: mkProven('AK Dept. Store — dipajang', 'beautyground.co.kr — dijual sekarang', 'Dibeli langsung & dijual kembali oleh Beautyground', ['Ritel', 'Online', 'Perdagangan']),
    priceOnRequest: 'Harga grosir sesuai permintaan', retail: 'Ritel Korea',
    shopBtn: 'Beli ritel', wholesaleBtn: 'Pertanyaan grosir', wholesaleSub: 'Dibalas dalam 24 jam',
    ctaSub: 'Ritel dan ekspor ditangani oleh Beautyground, Seoul.',
    notFoundTitle: 'Halaman merek ini belum dibuka.',
    notFoundBody: 'Halaman dibuka setelah merek melengkapi profil ekspor di Beautyground.',
    notFoundCta: 'Lihat katalog ekspor',
  },
  vi: {
    products: 'Sản phẩm', certs: 'Chứng nhận', proven: 'Kiểm chứng tại Hàn Quốc',
    provenRows: mkProven('TTTM AK — đang trưng bày', 'beautyground.co.kr — đang bán', 'Beautyground mua đứt & bán lại trực tiếp', ['Bán lẻ', 'Trực tuyến', 'Giao dịch']),
    priceOnRequest: 'Giá sỉ theo yêu cầu', retail: 'Giá lẻ Hàn Quốc',
    shopBtn: 'Mua lẻ', wholesaleBtn: 'Hỏi giá sỉ', wholesaleSub: 'Phản hồi trong 24h',
    ctaSub: 'Bán lẻ và xuất khẩu đều do Beautyground, Seoul đảm nhận.',
    notFoundTitle: 'Trang thương hiệu này chưa được mở.',
    notFoundBody: 'Trang sẽ mở khi thương hiệu hoàn tất hồ sơ xuất khẩu với Beautyground.',
    notFoundCta: 'Xem danh mục xuất khẩu',
  },
  th: {
    products: 'สินค้า', certs: 'การรับรอง', proven: 'พิสูจน์แล้วในเกาหลี',
    provenRows: mkProven('ห้าง AK — วางจำหน่ายอยู่', 'beautyground.co.kr — กำลังขาย', 'Beautyground ซื้อขาดและขายต่อโดยตรง', ['ค้าปลีก', 'ออนไลน์', 'การค้า']),
    priceOnRequest: 'ราคาส่งสอบถามได้', retail: 'ราคาปลีกเกาหลี',
    shopBtn: 'ซื้อปลีก', wholesaleBtn: 'สอบถามราคาส่ง', wholesaleSub: 'ตอบกลับภายใน 24 ชม.',
    ctaSub: 'ค้าปลีกและส่งออกดำเนินการโดย Beautyground โซล',
    notFoundTitle: 'หน้าแบรนด์นี้ยังไม่เปิด',
    notFoundBody: 'จะเปิดเมื่อแบรนด์ลงทะเบียนข้อมูลส่งออกกับ Beautyground เสร็จสิ้น',
    notFoundCta: 'ดูแคตตาล็อกส่งออก',
  },
  ru: {
    products: 'Продукция', certs: 'Сертификаты', proven: 'Проверено в Корее',
    provenRows: mkProven('Универмаг AK — представлено', 'beautyground.co.kr — в продаже', 'Прямая закупка и перепродажа Beautyground', ['Розница', 'Онлайн', 'Торговля']),
    priceOnRequest: 'Оптовая цена по запросу', retail: 'Розница в Корее',
    shopBtn: 'Купить в розницу', wholesaleBtn: 'Оптовый запрос', wholesaleSub: 'Ответ в течение 24 ч',
    ctaSub: 'Розница и экспорт — Beautyground, Сеул.',
    notFoundTitle: 'Страница бренда ещё не открыта.',
    notFoundBody: 'Она откроется, когда бренд завершит экспортный профиль в Beautyground.',
    notFoundCta: 'Смотреть экспортный каталог',
  },
  ko: {
    products: '제품', certs: '인증', proven: 'Proven in Korea',
    provenRows: mkProven('AK백화점 — 매장 진열 중', 'beautyground.co.kr — 판매 중', '뷰티그라운드 직매입 후 재판매', ['오프라인', '온라인', '거래방식']),
    priceOnRequest: '도매가 문의', retail: '한국 소비자가',
    shopBtn: '구매하기', wholesaleBtn: '도매 문의', wholesaleSub: '24시간 내 회신',
    ctaSub: '소매·수출 모두 서울 뷰티그라운드가 운영합니다.',
    notFoundTitle: '아직 개설되지 않은 브랜드 페이지입니다.',
    notFoundBody: '브랜드가 뷰티그라운드 수출 프로필 등록을 완료하면 열립니다.',
    notFoundCta: '수출 카탈로그 보기',
  },
}

type I18nMap = Partial<Record<Lang, string>>

interface ExportBrandRow extends ExportBrandPublic {
  export_pitch_i18n?: I18nMap | null
}

interface ExportProduct {
  id: string
  name: string
  thumbnail_url: string | null
  price: number | null
  export_image_urls: string[] | null
  export_description_en: string | null
  is_export_featured: boolean
  export_i18n?: { name?: I18nMap; desc?: I18nMap } | null
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[\s\-_]/g, '')
const isRegistered = (b: ExportBrandPublic) => (b.export_pitch_en?.trim() ?? '').length > 0

function LangButton({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] tracking-[0.08em] text-[#8A8577] border border-[#E6E3DC] px-3 py-1.5 hover:border-[#16202F] hover:text-[#16202F] transition-colors"
      >
        {LANGS.find((l) => l.code === lang)?.label} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 max-h-[300px] overflow-y-auto bg-white border border-[#E6E3DC] shadow-[0_8px_24px_rgba(22,32,47,0.08)] z-40">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => { setLang(l.code); setOpen(false) }}
                className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${
                  l.code === lang ? 'text-[#16202F] font-bold bg-[#FAF9F6]' : 'text-[#8A8577] hover:bg-[#FAF9F6]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ExportBrand() {
  const { key = '' } = useParams()
  const navigate = useNavigate()
  const [brand, setBrand] = useState<ExportBrandRow | null | undefined>(undefined)
  const [products, setProducts] = useState<ExportProduct[]>([])
  const [previewOnly, setPreviewOnly] = useState(false)
  const [lang, setLang] = useState<Lang>(detectLang)
  const t = COPY[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: rows } = await supabase.from('export_brand_public').select('*')
      if (cancelled) return
      const list = (rows ?? []) as ExportBrandRow[]
      const decoded = norm(decodeURIComponent(key))
      let found = list.find((b) => b.id === key) ?? list.find((b) => norm(b.brand_name) === decoded) ?? null
      // 승인 대기(pending) 브랜드는 공개 뷰에 없다 — 본인 계정으로 로그인한 경우에만 미리보기 허용
      if (!found) {
        const { data: auth } = await supabase.auth.getUser()
        if (auth.user) {
          const { data: mine } = await supabase.from('partners').select('*').eq('user_id', auth.user.id).maybeSingle()
          const mineRow = mine as unknown as ExportBrandRow | null
          if (mineRow && (mineRow.id === key || norm(mineRow.brand_name) === decoded)) {
            found = mineRow
            if (!cancelled) setPreviewOnly(true)
          }
        }
      }
      if (cancelled) return
      if (!found || !isRegistered(found)) { setBrand(null); return }
      setBrand(found)
      const hasI18n = 'export_pitch_i18n' in found
      const cols = 'id,name,thumbnail_url,price,export_image_urls,export_description_en,is_export_featured' + (hasI18n ? ',export_i18n' : '')
      // hidden = 셀프 가입 브랜드가 만든 수출 전용 상품(쇼핑몰 비노출) — 수출 페이지에는 노출된다.
      // 이미지가 하나도 없는 상품은 라인시트에 빈 칸이 생기므로 클라이언트에서 걸러낸다.
      const { data: prodRows } = await supabase
        .from('products')
        .select(cols)
        .eq('partner_id', found.id)
        .in('status', ['on_sale', 'hidden'])
        .eq('is_export_featured', true)
        .order('created_at', { ascending: false })
        .limit(12)
      if (cancelled) return
      const prodList: ExportProduct[] = prodRows ? (prodRows as unknown as ExportProduct[]) : []
      setProducts(prodList.filter((p) => (p.export_image_urls?.[0] ?? p.thumbnail_url)))
    })()
    return () => { cancelled = true }
  }, [key])

  const certs = useMemo(() => (brand?.export_certifications ?? []).filter(Boolean), [brand])

  useEffect(() => {
    if (brand) document.title = `${brand.brand_name} — K-Beauty Export | BEAUTYGROUND`
  }, [brand])

  const pitchText = brand
    ? (brand.export_pitch_i18n?.[lang]?.trim() || (lang === 'en' ? '' : brand.export_pitch_i18n?.en?.trim() || '') || brand.export_pitch_en || '')
    : ''
  const productName = (p: ExportProduct) => p.export_i18n?.name?.[lang]?.trim() || p.export_i18n?.name?.en?.trim() || p.name

  if (brand === undefined) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-[12px] tracking-[0.2em] text-[#B9B4A8]">BEAUTYGROUND EXPORT</div>
  }
  if (brand === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <CuratorSeal size={72} />
        <p className="font-serif text-[19px] text-[#16202F] leading-snug">{COPY[lang].notFoundTitle}</p>
        <p className="text-[13px] text-[#8A8577] leading-relaxed max-w-[300px]">{COPY[lang].notFoundBody}</p>
        <Link to="/export" className="mt-3 text-[12px] tracking-[0.1em] text-[#16202F] border-b border-[#16202F] pb-0.5 hover:text-[#E53E3E] hover:border-[#E53E3E] transition-colors">
          {COPY[lang].notFoundCta} →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex justify-center">
      <style>{`
        @keyframes sheetIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes ruleDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes sealIn{from{opacity:0;transform:rotate(-16deg) scale(.9)}to{opacity:1;transform:rotate(-8deg) scale(1)}}
        .sheet-in{animation:sheetIn .55s cubic-bezier(.2,.7,.3,1) both}
        .sheet-in:nth-of-type(2){animation-delay:.07s}.sheet-in:nth-of-type(3){animation-delay:.14s}.sheet-in:nth-of-type(4){animation-delay:.21s}
        .rule-draw{transform-origin:left;animation:ruleDraw .7s .15s cubic-bezier(.2,.7,.3,1) both}
        .seal-in{animation:sealIn .6s .35s cubic-bezier(.2,.7,.3,1) both}
        @media (prefers-reduced-motion: reduce){.sheet-in,.rule-draw,.seal-in{animation:none;transform:rotate(-8deg)}}
        .x-scroll::-webkit-scrollbar{display:none}
      `}</style>

      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-[0_0_50px_rgba(22,32,47,0.06)] flex flex-col">

        {/* ── 승인 대기 미리보기 안내 — 본인에게만 보이는 상태 ── */}
        {previewOnly && (
          <div className="bg-[#111111] text-white text-center px-4 py-2 text-[11px] leading-[1.6]">
            <span className="text-[#FF8A8A] font-bold">승인 대기 미리보기</span> — 이 페이지는 지금 본인에게만 보입니다. 뷰티그라운드 승인 후 바이어에게 공개됩니다.
          </div>
        )}

        {/* ── 상단: 뒤로가기 + 홈 + 플랫폼 표기 + 언어 ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="이전 페이지로"
              className="text-[#8A8577] hover:text-[#16202F] transition-colors text-[15px] shrink-0"
            >
              ←
            </button>
            <Link
              to="/export"
              className="text-[10.5px] tracking-[0.3em] text-[#8A8577] hover:text-[#16202F] transition-colors truncate"
            >
              BEAUTYGROUND <span className="text-[#E53E3E]">EXPORT</span>
            </Link>
          </div>
          <LangButton lang={lang} setLang={setLang} />
        </div>
        <div className="mx-6 h-px bg-[#16202F] rule-draw" />

        {/* ── 브랜드 헤더 — 라인시트 표지 ── */}
        <header className="px-6 pt-7 pb-6 relative sheet-in">
          <div className="pr-24">
            {brand.export_logo_url && (
              <div className="h-12 max-w-[180px] flex items-center border border-[#E6E3DC] px-2 mb-4">
                <img src={brand.export_logo_url} alt="" className="max-h-9 max-w-full w-auto object-contain" />
              </div>
            )}
            <h1 className="font-serif text-[30px] leading-[1.15] text-[#16202F] break-keep">{brand.brand_name}</h1>
            {pitchText && (
              <p className="text-[13px] text-[#5A564B] leading-[1.8] mt-3">{pitchText}</p>
            )}
            {(brand.export_countries || brand.export_moq_notes) && (
              <p className="text-[11px] tracking-[0.06em] text-[#8A8577] mt-4 uppercase">
                {brand.export_countries && <>Exporting — <span className="text-[#16202F]">{brand.export_countries}</span></>}
                {brand.export_countries && brand.export_moq_notes && <span className="mx-2 text-[#D8D4C9]">|</span>}
                {brand.export_moq_notes && <>MOQ — <span className="text-[#16202F]">{brand.export_moq_notes}</span></>}
              </p>
            )}
          </div>
          <div className="absolute top-5 right-5 seal-in"><CuratorSeal /></div>
        </header>

        {/* ── PROVEN IN KOREA — 스펙 테이블 (뷰티그라운드 자동 삽입, DB 사실만) ── */}
        <section className="px-6 pb-2 sheet-in">
          <p className="text-[10.5px] tracking-[0.28em] uppercase text-[#111111] pb-2 border-b border-[#111111]">{t.proven}</p>
          <table className="w-full">
            <tbody>
              {t.provenRows.map(([label, value]) => (
                <tr key={label} className="border-b border-[#EBE8E0]">
                  <td className="py-2.5 pr-3 text-[10.5px] tracking-[0.12em] uppercase text-[#8A8577] whitespace-nowrap align-top w-[86px]">{label}</td>
                  <td className="py-2.5 text-[12.5px] text-[#16202F] leading-relaxed">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── 제품 — 2열 그리드 ── */}
        {products.length > 0 && (
          <section className="px-6 pt-6 sheet-in">
            <div className="flex items-baseline justify-between pb-2 border-b border-[#16202F]">
              <p className="text-[10.5px] tracking-[0.28em] uppercase text-[#111111]">{t.products}</p>
              <p className="text-[10.5px] text-[#B9B4A8]">{String(products.length).padStart(2, '0')}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-4">
              {products.map((p) => {
                const img = p.export_image_urls?.[0] ?? p.thumbnail_url ?? ''
                return (
                  <figure key={p.id}>
                    <div className="border border-[#E6E3DC] bg-[#FAF9F6]">
                      <img src={img} alt={productName(p)} className="w-full aspect-square object-cover mix-blend-multiply" loading="lazy" />
                    </div>
                    <figcaption className="mt-2">
                      <p className="text-[12px] font-medium text-[#16202F] leading-[1.45] line-clamp-2">{productName(p)}</p>
                      <p className="text-[10.5px] text-[#8A8577] mt-1">
                        {p.price ? `${t.retail} ₩${p.price.toLocaleString()}` : ''}
                      </p>
                      <p className="text-[10.5px] text-[#E53E3E] mt-0.5">{t.priceOnRequest}</p>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 인증 ── */}
        {certs.length > 0 && (
          <section className="px-6 pt-7 sheet-in">
            <p className="text-[10.5px] tracking-[0.28em] uppercase text-[#111111] pb-2 border-b border-[#111111]">{t.certs}</p>
            <p className="pt-3 text-[12.5px] text-[#16202F] leading-[2]">
              {certs.map((c, i) => (
                <span key={c}>
                  {c}
                  {i < certs.length - 1 && <span className="mx-2.5 text-[#D8D4C9]">·</span>}
                </span>
              ))}
            </p>
          </section>
        )}

        <div className="flex-1 min-h-8" />

        {/* ── CTA — 하단 고정 글래스 캡슐(ERP 투명 버튼 스타일) — 스크롤 콘텐츠가 뒤로 비쳐 보인다 ── */}
        <div className="sticky bottom-0 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-white via-white/60 to-transparent">
          <div className="flex gap-2.5">
            <Link
              to={`/app/brand/${brand.id}`}
              className="flex-1 text-center rounded-full py-3.5 text-[12.5px] tracking-[0.06em] text-[#16202F] bg-white/55 border border-white/90 backdrop-blur-[20px] backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_20px_rgba(70,90,190,0.14)] hover:bg-white/75 active:opacity-85 transition-colors"
            >
              {t.shopBtn}
            </Link>
            <Link
              to="/export"
              className="flex-[1.4] text-center rounded-full py-3.5 text-[12.5px] tracking-[0.06em] text-white bg-[#E53E3E]/85 border border-white/25 backdrop-blur-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_22px_rgba(229,62,62,0.28)] hover:bg-[#E53E3E] active:opacity-90 transition-colors"
            >
              {t.wholesaleBtn} <span className="text-white/80 ml-1 text-[10px]">{t.wholesaleSub}</span>
            </Link>
          </div>
          <p className="text-center text-[9.5px] text-[#B9B4A8] mt-2.5">{t.ctaSub}</p>
        </div>
      </div>
    </div>
  )
}
