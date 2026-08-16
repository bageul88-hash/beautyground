import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { ExportBrandPublic } from '../lib/types'

// 브랜드별 수출 미니페이지(/x/:key) — 해외 바이어·소비자에게 링크/QR 하나로 전달하는 모바일 원페이지.
// key는 partners.id(uuid) 또는 brand_name(한글 포함, URL 인코딩) 둘 다 허용.
//
// ⚠️ 원칙: 우리는 틀만 제공한다. 이 페이지는 브랜드사가 직접 가입해 수출 정보(영문 소개)를
// 채운 경우에만 열린다 — 안 채운 브랜드 주소는 "아직 개설되지 않음" 안내만 보여준다.
// 데이터는 기존 수출 스키마(export_brand_public 뷰 + products의 export_* 컬럼)를 그대로 읽는다.

type Lang = 'en' | 'tw' | 'ja' | 'es' | 'ko'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'tw', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'ko', label: '한국어' },
]

// 브라우저 언어 자동 감지 — 해외 바이어가 주 타깃이라 기본은 영어
function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const nl = navigator.language?.toLowerCase() ?? ''
  if (nl.startsWith('ko')) return 'ko'
  if (nl.startsWith('zh')) return 'tw'
  if (nl.startsWith('ja')) return 'ja'
  if (nl.startsWith('es')) return 'es'
  return 'en'
}

interface Copy {
  products: string
  certs: string
  provenTitle: string
  provenStore: [string, string]
  provenMall: (n: number) => [string, string]
  provenDirect: [string, string]
  priceOnRequest: string
  retail: string
  shopBtn: [string, string]
  wholesaleBtn: [string, string]
  ctaSub: string
  footer: string
  notFoundTitle: string
  notFoundBody: string
  notFoundCta: string
}

const COPY: Record<Lang, Copy> = {
  en: {
    products: 'PRODUCTS', certs: 'CERTIFICATIONS', provenTitle: '✦ PROVEN IN KOREA — BY BEAUTYGROUND',
    provenStore: ['Dept. Store', 'On display in Korea'], provenMall: (n) => [`${n} Products`, 'On Beautyground mall'],
    provenDirect: ['Direct', 'Buy & resell — not a listing'],
    priceOnRequest: 'Wholesale price on request', retail: 'Korea retail',
    shopBtn: ['🛒 Shop This Brand', 'Beautyground online mall'], wholesaleBtn: ['💬 Wholesale Inquiry', 'Reply within 24h'],
    ctaSub: 'Retail & export both handled by BEAUTYGROUND, Seoul',
    footer: 'CURATED & EXPORTED BY',
    notFoundTitle: 'This brand page is not open yet.',
    notFoundBody: 'The brand has not completed its export profile with Beautyground.',
    notFoundCta: 'Browse our export catalog',
  },
  tw: {
    products: '產品', certs: '認證', provenTitle: '✦ 韓國實績 — BY BEAUTYGROUND',
    provenStore: ['百貨公司', '韓國門市陳列中'], provenMall: (n) => [`${n} 件商品`, 'Beautyground 商城販售中'],
    provenDirect: ['直營', '直接買斷再販售'],
    priceOnRequest: '批發價格請洽詢', retail: '韓國零售價',
    shopBtn: ['🛒 選購此品牌', 'Beautyground 線上商城'], wholesaleBtn: ['💬 批發洽詢', '24小時內回覆'],
    ctaSub: '零售與出口皆由首爾 BEAUTYGROUND 營運',
    footer: 'CURATED & EXPORTED BY',
    notFoundTitle: '此品牌頁面尚未開設。',
    notFoundBody: '該品牌尚未在 Beautyground 完成出口資料登錄。',
    notFoundCta: '瀏覽我們的出口型錄',
  },
  ja: {
    products: '商品', certs: '認証', provenTitle: '✦ 韓国での実績 — BY BEAUTYGROUND',
    provenStore: ['百貨店', '韓国の店舗で陳列中'], provenMall: (n) => [`${n} 商品`, 'Beautygroundモールで販売中'],
    provenDirect: ['直営', '直接買付・再販売'],
    priceOnRequest: '卸価格はお問い合わせください', retail: '韓国小売価格',
    shopBtn: ['🛒 このブランドを購入', 'Beautygroundオンラインモール'], wholesaleBtn: ['💬 卸売のお問い合わせ', '24時間以内に返信'],
    ctaSub: '小売・輸出ともにソウルのBEAUTYGROUNDが運営',
    footer: 'CURATED & EXPORTED BY',
    notFoundTitle: 'このブランドページはまだ開設されていません。',
    notFoundBody: 'ブランドがBeautygroundでの輸出プロフィール登録を完了していません。',
    notFoundCta: '輸出カタログを見る',
  },
  es: {
    products: 'PRODUCTOS', certs: 'CERTIFICACIONES', provenTitle: '✦ PROBADO EN COREA — BY BEAUTYGROUND',
    provenStore: ['Gran Almacén', 'En exhibición en Corea'], provenMall: (n) => [`${n} Productos`, 'En la tienda Beautyground'],
    provenDirect: ['Directo', 'Compra y reventa directa'],
    priceOnRequest: 'Precio mayorista a consultar', retail: 'Precio Corea',
    shopBtn: ['🛒 Comprar Esta Marca', 'Tienda online Beautyground'], wholesaleBtn: ['💬 Consulta Mayorista', 'Respuesta en 24h'],
    ctaSub: 'Venta minorista y exportación gestionadas por BEAUTYGROUND, Seúl',
    footer: 'CURATED & EXPORTED BY',
    notFoundTitle: 'Esta página de marca aún no está abierta.',
    notFoundBody: 'La marca no ha completado su perfil de exportación con Beautyground.',
    notFoundCta: 'Ver nuestro catálogo de exportación',
  },
  ko: {
    products: '제품', certs: '인증', provenTitle: '✦ PROVEN IN KOREA — BY BEAUTYGROUND',
    provenStore: ['백화점', '한국 매장 진열 중'], provenMall: (n) => [`${n}개 제품`, '뷰티그라운드몰 판매 중'],
    provenDirect: ['직매입', '직접 매입 후 재판매'],
    priceOnRequest: '도매가 문의', retail: '한국 소비자가',
    shopBtn: ['🛒 이 브랜드 구매하기', '뷰티그라운드 온라인몰'], wholesaleBtn: ['💬 도매 문의', '24시간 내 회신'],
    ctaSub: '소매·수출 모두 서울 뷰티그라운드가 운영합니다',
    footer: 'CURATED & EXPORTED BY',
    notFoundTitle: '아직 개설되지 않은 브랜드 페이지입니다.',
    notFoundBody: '브랜드가 뷰티그라운드 수출 프로필 등록을 완료하면 열립니다.',
    notFoundCta: '수출 카탈로그 보기',
  },
}

interface ExportProduct {
  id: string
  name: string
  thumbnail_url: string | null
  price: number | null
  export_image_urls: string[] | null
  export_description_en: string | null
  is_export_featured: boolean
}

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[\s\-_]/g, '')

// 가입(등록) 완료 판정 — 영문 소개를 채워야 페이지가 열린다. 우리는 틀만 제공하고,
// 브랜드사가 직접 가입해 채워야 자기 페이지가 생기는 구조(대표님 원칙).
const isRegistered = (b: ExportBrandPublic) => (b.export_pitch_en?.trim() ?? '').length > 0

function LangButton({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute top-3.5 right-3.5 z-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-bold text-white/85 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm"
      >
        <span aria-hidden>🌐</span>
        {LANGS.find((l) => l.code === lang)?.label}
        <span className="text-[8px] opacity-60 ml-0.5">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl overflow-hidden z-40 border border-[#E8E6E1]">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => { setLang(l.code); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-[12.5px] transition-colors ${
                  l.code === lang ? 'bg-[#F8F3EA] text-[#1B2537] font-bold' : 'text-[#6B7280] hover:bg-[#F8F6F2]'
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
  const [brand, setBrand] = useState<ExportBrandPublic | null | undefined>(undefined) // undefined=로딩, null=미개설/없음
  const [products, setProducts] = useState<ExportProduct[]>([])
  const [lang, setLang] = useState<Lang>(detectLang)
  const t = COPY[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: rows } = await supabase.from('export_brand_public').select('*')
      if (cancelled) return
      const list = (rows ?? []) as ExportBrandPublic[]
      const decoded = norm(decodeURIComponent(key))
      const found = list.find((b) => b.id === key) ?? list.find((b) => norm(b.brand_name) === decoded) ?? null
      // 등록(가입) 완료한 브랜드만 페이지 오픈 — 미등록 브랜드는 미개설 안내
      if (!found || !isRegistered(found)) { setBrand(null); return }
      setBrand(found)
      const { data: prodRows } = await supabase
        .from('products')
        .select('id,name,thumbnail_url,price,export_image_urls,export_description_en,is_export_featured')
        .eq('partner_id', found.id)
        .eq('status', 'on_sale')
        .eq('is_export_featured', true)
        .not('thumbnail_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12)
      if (cancelled) return
      setProducts((prodRows ?? []) as ExportProduct[])
    })()
    return () => { cancelled = true }
  }, [key])

  const certs = useMemo(() => (brand?.export_certifications ?? []).filter(Boolean), [brand])

  useEffect(() => {
    if (brand) document.title = `${brand.brand_name} — K-Beauty Export | BEAUTYGROUND`
  }, [brand])

  if (brand === undefined) {
    return <div className="min-h-screen bg-[#F4F2EE] flex items-center justify-center text-[13px] text-[#9A9488]">Loading…</div>
  }
  if (brand === null) {
    return (
      <div className="min-h-screen bg-[#F4F2EE] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-serif text-[13px] tracking-[0.25em] text-[#B08A4F]">BEAUTYGROUND EXPORT</p>
        <p className="text-[16px] font-bold text-[#1B2537]">{t.notFoundTitle}</p>
        <p className="text-[13px] text-[#6B7280]">{t.notFoundBody}</p>
        <Link to="/export" className="mt-2 text-[13px] font-bold text-white bg-[#1B2537] rounded-full px-5 py-2.5">
          {t.notFoundCta}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] flex justify-center">
      <style>{`
        @keyframes xShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes xFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes xPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,193,94,.35)}50%{box-shadow:0 0 0 9px rgba(34,193,94,0)}}
        .x-anim{animation:xFadeUp .6s both}
        .x-scroll::-webkit-scrollbar{display:none}
      `}</style>

      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-[0_0_60px_rgba(27,37,55,0.12)] flex flex-col relative">
        {/* ── 히어로 ── */}
        <header className="relative bg-gradient-to-br from-[#20293C] via-[#1B2537] to-[#2A3550] text-white text-center px-6 pt-14 pb-6">
          <LangButton lang={lang} setLang={setLang} />
          {brand.export_logo_url ? (
            <img src={brand.export_logo_url} alt={brand.brand_name} className="w-16 h-16 rounded-full object-cover bg-white mx-auto mb-3 border-2 border-white/20" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white text-[#1B2537] font-serif text-[20px] font-bold flex items-center justify-center mx-auto mb-3">
              {brand.brand_name.charAt(0)}
            </div>
          )}
          <h1 className="font-serif text-[21px] tracking-[0.08em]">{brand.brand_name}</h1>
          {brand.export_pitch_en && (
            <p className="text-[12px] text-[#C8CEDB] mt-2 leading-relaxed">{brand.export_pitch_en}</p>
          )}
          {(brand.export_countries || brand.export_moq_notes) && (
            <div className="flex gap-1.5 justify-center flex-wrap mt-3.5">
              {brand.export_countries && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40">
                  Exporting: {brand.export_countries}
                </span>
              )}
              {brand.export_moq_notes && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#C9A96E]/20 text-[#C9A96E] border border-[#C9A96E]/40">
                  MOQ: {brand.export_moq_notes}
                </span>
              )}
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-[linear-gradient(90deg,transparent,#C9A96E,#F0DDB8,#C9A96E,transparent)] bg-[length:200%_100%] animate-[xShimmer_3.5s_linear_infinite]" />
        </header>

        {/* ── PROVEN IN KOREA (뷰티그라운드 자동 삽입 — DB 사실만 표시) ── */}
        <section className="bg-[#141B2B] px-4 pt-3.5 pb-4">
          <p className="text-[9.5px] font-black tracking-[0.22em] text-[#C9A96E] text-center mb-2.5">{t.provenTitle}</p>
          <div className="flex gap-2">
            {[t.provenStore, t.provenMall(products.length), t.provenDirect].map(([v, k]) => (
              <div key={k} className="flex-1 bg-white/[0.055] border border-[#C9A96E]/25 rounded-xl px-1.5 py-2.5 text-center">
                <p className="text-[13px] font-black text-white leading-tight">{v}</p>
                <p className="text-[8.5px] text-[#9AA3B5] mt-1 leading-snug">{k}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 제품 (브랜드가 직접 지정한 수출 대표상품만) ── */}
        {products.length > 0 && (
          <section className="px-4 pt-5 x-anim">
            <p className="text-[11px] font-black tracking-[0.18em] text-[#B08A4F] mb-3">{t.products}</p>
            <div className="flex gap-3 overflow-x-auto pb-4 x-scroll [scrollbar-width:none]">
              {products.map((p) => {
                const img = p.export_image_urls?.[0] ?? p.thumbnail_url ?? ''
                return (
                  <div key={p.id} className="min-w-[136px] w-[136px] bg-white border border-[#E8E6E1] rounded-2xl overflow-hidden relative shrink-0">
                    <img src={img} alt={p.name} className="w-full aspect-square object-cover" loading="lazy" />
                    <div className="px-2.5 py-2">
                      <p className="text-[11px] font-bold leading-[1.35] line-clamp-2">{p.name}</p>
                      <p className="text-[9.5px] text-[#B08A4F] font-bold mt-1.5">
                        {p.price ? `${t.retail} ₩${p.price.toLocaleString()}` : t.priceOnRequest}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 인증 ── */}
        {certs.length > 0 && (
          <section className="px-4 pt-2 x-anim">
            <p className="text-[11px] font-black tracking-[0.18em] text-[#B08A4F] mb-2.5">{t.certs}</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {certs.map((c) => (
                <span key={c} className="text-[10px] font-bold text-[#1B2537] bg-white border border-[#E8E6E1] px-2.5 py-1.5 rounded-lg">✓ {c}</span>
              ))}
            </div>
          </section>
        )}

        <div className="flex-1" />

        {/* ── 듀얼 CTA (하단 고정) — 소비자는 구매로, 바이어는 도매문의로 ── */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pt-4 pb-3.5">
          <div className="flex gap-2">
            <Link
              to={`/app/brand/${brand.id}`}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2.5 bg-[#1B2537] text-white active:opacity-85"
            >
              <span className="text-[12.5px] font-black">{t.shopBtn[0]}</span>
              <span className="text-[8.5px] text-[#C9A96E]">{t.shopBtn[1]}</span>
            </Link>
            <Link
              to="/export"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2.5 bg-[#22C15E] text-white animate-[xPulse_2.6s_infinite] active:opacity-85"
            >
              <span className="text-[12.5px] font-black">{t.wholesaleBtn[0]}</span>
              <span className="text-[8.5px] opacity-80">{t.wholesaleBtn[1]}</span>
            </Link>
          </div>
          <p className="text-center text-[9px] text-[#9A9488] mt-2">{t.ctaSub}</p>
        </div>

        <footer className="text-center text-[9px] text-[#B4AFA6] tracking-[0.15em] pb-5 bg-white">
          {t.footer} <span className="font-serif text-[#B08A4F]">BEAUTYGROUND</span> · SEOUL
        </footer>
      </div>
    </div>
  )
}
