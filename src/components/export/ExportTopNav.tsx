import { Link } from 'react-router-dom'

// 엑스포트(해외 바이어) 공통 상단 카테고리 내비 — 스크롤해도 상단 고정(sticky).
// 로드맵 3단 구조(/export 랜딩 → /x/:key 브랜드 → 상품)에서 바이어가 어디서든 바로 갈 핵심 구역 4개:
// Home(랜딩) · Brands(전체 브랜드) · Categories(취급 카테고리) · Inquiry(문의 폼).
// 팔레트 규칙: 화이트 면 + 블랙 글씨, 중요 액션(Inquiry)만 레드. 이모지·그라데이션 없음.
// 아래 콘텐츠(← 바 등)와 경계가 분명하도록 하단 1px 블랙 라인 + 16px 간격(mb-4) — 2026-08-26 대표님 지시.

export type ExportNavKey = 'home' | 'brands' | 'categories' | 'inquiry'

interface ExportTopNavProps {
  /** 미니페이지 언어 코드(en/ko/ja/zh/zh_cn/zh_tw/es/ms/id/vi/th/ru) — 없는 코드는 영어로 폴백 */
  lang: string
  active?: ExportNavKey
  /** sheet: 430px 미니페이지 폭 / wide: 랜딩·목록의 넓은 컨테이너 */
  layout?: 'sheet' | 'wide'
  /** 위에 GNB(h-16)가 있는 페이지는 16, 없으면 0 */
  stickyTop?: 0 | 16
}

const LABELS: Record<string, Record<ExportNavKey, string>> = {
  en: { home: 'Home', brands: 'Brands', categories: 'Categories', inquiry: 'Inquiry' },
  ko: { home: '홈', brands: '브랜드', categories: '카테고리', inquiry: '문의' },
  ja: { home: 'ホーム', brands: 'ブランド', categories: 'カテゴリー', inquiry: 'お問い合わせ' },
  zh: { home: '首页', brands: '品牌', categories: '品类', inquiry: '询价' },
  zh_cn: { home: '首页', brands: '品牌', categories: '品类', inquiry: '询价' },
  zh_tw: { home: '首頁', brands: '品牌', categories: '品類', inquiry: '詢價' },
  es: { home: 'Inicio', brands: 'Marcas', categories: 'Categorías', inquiry: 'Consulta' },
  ms: { home: 'Utama', brands: 'Jenama', categories: 'Kategori', inquiry: 'Pertanyaan' },
  id: { home: 'Beranda', brands: 'Merek', categories: 'Kategori', inquiry: 'Pertanyaan' },
  vi: { home: 'Trang chủ', brands: 'Thương hiệu', categories: 'Danh mục', inquiry: 'Liên hệ' },
  th: { home: 'หน้าแรก', brands: 'แบรนด์', categories: 'หมวดหมู่', inquiry: 'สอบถาม' },
  ru: { home: 'Главная', brands: 'Бренды', categories: 'Категории', inquiry: 'Запрос' },
}

const ITEMS: { key: ExportNavKey; to: string }[] = [
  { key: 'home', to: '/export' },
  { key: 'brands', to: '/export/brands' },
  { key: 'categories', to: '/export#categories' },
  { key: 'inquiry', to: '/export#export-inquiry-form' },
]

export default function ExportTopNav({ lang, active, layout = 'wide', stickyTop = 0 }: ExportTopNavProps) {
  const t = LABELS[lang] ?? LABELS.en
  const inner = layout === 'sheet' ? 'px-6' : 'max-w-[1080px] mx-auto px-6'
  return (
    <nav
      aria-label="Export navigation"
      className={`sticky ${stickyTop === 16 ? 'top-16' : 'top-0'} z-40 bg-white border-b border-ink mb-4`}
    >
      <div className={`${inner} flex items-center gap-6 overflow-x-auto scrollbar-hide h-11`}>
        {ITEMS.map(({ key, to }) => {
          const isActive = active === key
          const isInquiry = key === 'inquiry'
          return (
            <Link
              key={key}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 h-full flex items-center text-[11.5px] tracking-[0.18em] uppercase border-b-2 transition-colors ${
                isActive
                  ? 'text-ink border-ink font-bold'
                  : isInquiry
                    ? 'text-signal-red border-transparent hover:border-signal-red font-bold'
                    : 'text-ink-soft border-transparent hover:text-ink hover:border-ink'
              }`}
            >
              {t[key]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
