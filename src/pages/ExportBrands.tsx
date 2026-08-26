import { useState } from 'react'
import { Link } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import LanguageSwitcher from '../components/export/LanguageSwitcher'
import ExportTopNav from '../components/export/ExportTopNav'
import ExportBrandCard, { type ExportBrandCardLabels } from '../components/export/ExportBrandCard'
import { useExportBrandCards } from '../hooks/useExportBrandCards'
import { type Lang, detectLang } from '../lib/exportI18n'

interface Copy extends ExportBrandCardLabels {
  kicker: string
  title: string
  body: (count: number) => string
  back: string
  empty: string
}

const COPY: Record<Lang, Copy> = {
  ko: {
    kicker: '전체 브랜드',
    title: '뷰티그라운드가 직접 공급하는 브랜드',
    body: (n) => `${n}개 브랜드 — 저희가 직접 매입해 판매하는 포트폴리오 전체입니다.`,
    back: '← 해외 바이어 페이지로',
    empty: '등록된 브랜드가 아직 없습니다.',
    viewAllProducts: '전체 상품 보기 →',
    exportingToLabel: '현재 수출 국가',
    moqLabel: 'MOQ · 샘플 정책',
  },
  en: {
    kicker: 'All Brands',
    title: 'Every Brand We Supply',
    body: (n) => `${n} brands — the full portfolio we directly buy from and sell.`,
    back: '← Back to Global Buyers',
    empty: 'No brands listed yet.',
    viewAllProducts: 'View All Products →',
    exportingToLabel: 'Currently Exporting To',
    moqLabel: 'MOQ · Sample Policy',
  },
  ja: {
    kicker: '全ブランド',
    title: '取扱ブランド一覧',
    body: (n) => `${n}ブランド — 当社が直接仕入れて販売するポートフォリオの全てです。`,
    back: '← 海外バイヤー向けページへ',
    empty: '登録されたブランドはまだありません。',
    viewAllProducts: 'すべての商品を見る →',
    exportingToLabel: '現在の輸出国',
    moqLabel: 'MOQ · サンプルポリシー',
  },
  zh: {
    kicker: '全部品牌',
    title: '我们直接供应的所有品牌',
    body: (n) => `${n}个品牌 — 这是我们直接采购并销售的完整组合。`,
    back: '← 返回海外买家页面',
    empty: '暂无已登记的品牌。',
    viewAllProducts: '查看全部产品 →',
    exportingToLabel: '当前出口国家',
    moqLabel: 'MOQ · 样品政策',
  },
  es: {
    kicker: 'Todas las Marcas',
    title: 'Todas las marcas que suministramos',
    body: (n) => `${n} marcas — el portafolio completo que compramos y vendemos directamente.`,
    back: '← Volver a Compradores Globales',
    empty: 'Aún no hay marcas registradas.',
    viewAllProducts: 'Ver Todos los Productos →',
    exportingToLabel: 'Exportando actualmente a',
    moqLabel: 'MOQ · Política de Muestras',
  },
}

// /export/brands — 해외 바이어용 전체 브랜드 목록. /export 피처드 섹션(4개)의 "더보기" 화살표가 여기로 온다.
export default function ExportBrands() {
  const { brandCards, loading } = useExportBrandCards()
  const [lang, setLang] = useState<Lang>(detectLang)
  const t = COPY[lang]

  return (
    <>
      <GNB extra={<LanguageSwitcher lang={lang} setLang={setLang} />} />
      <ExportTopNav lang={lang} active="brands" layout="wide" stickyTop={16} />
      <main className="bg-paper">
        <section className="max-w-[1080px] mx-auto px-6 py-16 sm:py-20">
          <Link to="/export" className="inline-block text-[13px] text-ink-soft hover:text-ink hover:underline mb-8">
            {t.back}
          </Link>
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">{t.kicker}</p>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-ink">{t.title}</h1>
          <p className="text-ink-soft text-[14px] mt-2 mb-10">{t.body(brandCards.length)}</p>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-rule rounded-card p-6 h-[180px] animate-pulse bg-quiet/40" />
              ))}
            </div>
          ) : brandCards.length === 0 ? (
            <p className="py-16 text-center text-[14px] text-ink-faint">{t.empty}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {brandCards.map((brand) => (
                <ExportBrandCard key={brand.id} brand={brand} labels={t} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
