import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import LanguageSwitcher from '../../components/export/LanguageSwitcher'
import { supabase } from '../../lib/supabase'
import { PRODUCT_CATEGORIES } from '../../lib/types'
import type { ExportBrandPublic } from '../../lib/types'
import { type Lang, detectLang, CATEGORY_I18N } from '../../lib/exportI18n'

interface ProductRow {
  id: string
  name: string
  thumbnail_url: string | null
  export_image_urls: string[]
  category: string | null
  partner_id: string
}

interface CardData extends ProductRow {
  brand_name: string
}

interface Copy {
  kicker: string
  title: string
  body: string
  allFilter: string
  empty: string
  backHome: string
}

const COPY: Record<Lang, Copy> = {
  ko: {
    kicker: '전체 상품',
    title: '수출 대표상품',
    body: '뷰티그라운드 브랜드들이 해외 바이어를 위해 직접 고른 대표상품입니다.',
    allFilter: '전체',
    empty: '아직 등록된 상품이 없습니다.',
    backHome: '← 뷰티그라운드 수출 소개로',
  },
  en: {
    kicker: 'All Products',
    title: 'Featured Export Products',
    body: 'Products our brands have hand-picked to showcase to overseas buyers.',
    allFilter: 'All',
    empty: 'No products listed yet.',
    backHome: '← Back to Beautyground Export',
  },
  ja: {
    kicker: '全商品',
    title: '輸出向け代表商品',
    body: 'Beautygroundのブランドが海外バイヤー向けに厳選した代表商品です。',
    allFilter: 'すべて',
    empty: 'まだ登録された商品がありません。',
    backHome: '← Beautyground 輸出紹介へ戻る',
  },
  zh: {
    kicker: '全部产品',
    title: '出口精选产品',
    body: '这是Beautyground旗下品牌为海外买家精心挑选的代表产品。',
    allFilter: '全部',
    empty: '暂无已登记的产品。',
    backHome: '← 返回Beautyground出口介绍',
  },
  es: {
    kicker: 'Todos los Productos',
    title: 'Productos Destacados de Exportación',
    body: 'Productos que nuestras marcas han seleccionado especialmente para compradores internacionales.',
    allFilter: 'Todos',
    empty: 'Aún no hay productos registrados.',
    backHome: '← Volver a Beautyground Export',
  },
}

export default function ExportProductsList() {
  const [products, setProducts] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>(detectLang)

  const t = COPY[lang]
  const catLabel = (cat: string) => CATEGORY_I18N[lang][cat] ?? cat

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: productRows }, { data: brandRows }] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,thumbnail_url,export_image_urls,category,partner_id')
          .eq('is_export_featured', true)
          .eq('status', 'on_sale'),
        supabase.from('export_brand_public').select('id,brand_name'),
      ])
      if (cancelled) return
      const brandNames = new Map(((brandRows ?? []) as Pick<ExportBrandPublic, 'id' | 'brand_name'>[]).map((b) => [b.id, b.brand_name]))
      const cards = ((productRows ?? []) as ProductRow[]).map((p) => ({
        ...p,
        brand_name: brandNames.get(p.partner_id) ?? '',
      }))
      setProducts(cards)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const categoriesInUse = PRODUCT_CATEGORIES.filter((cat) => products.some((p) => p.category === cat))
  const visibleProducts = activeCategory ? products.filter((p) => p.category === activeCategory) : products

  return (
    <>
      <GNB extra={<LanguageSwitcher lang={lang} setLang={setLang} />} />
      <main className="bg-paper min-h-screen">
        <section className="border-b border-rule px-6 py-16 sm:py-20">
          <div className="max-w-[1080px] mx-auto">
            <Link to="/export" className="text-[13px] text-ink-soft hover:text-ink transition-colors">
              {t.backHome}
            </Link>
            <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mt-6 mb-2">{t.kicker}</p>
            <h1 className="text-[28px] sm:text-[36px] font-bold text-ink mb-3">{t.title}</h1>
            <p className="text-ink-soft text-[14px] sm:text-[15px] max-w-[600px]">{t.body}</p>
          </div>
        </section>

        <section className="max-w-[1080px] mx-auto px-6 py-12">
          {categoriesInUse.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`px-3.5 py-2 rounded-pill text-[12.5px] border transition-colors ${
                  activeCategory === null ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                }`}
              >
                {t.allFilter}
              </button>
              {categoriesInUse.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-2 rounded-pill text-[12.5px] border transition-colors ${
                    activeCategory === cat ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                  }`}
                >
                  {catLabel(cat)}
                </button>
              ))}
            </div>
          )}

          {!loading && visibleProducts.length === 0 && (
            <p className="text-ink-soft text-[14px] text-center py-20">{t.empty}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {visibleProducts.map((product) => (
              <Link key={product.id} to={`/export/products/${product.id}`} className="group">
                <figure className="rounded-card overflow-hidden border border-rule group-hover:border-ink transition-colors">
                  <img
                    src={product.export_image_urls[0] ?? product.thumbnail_url ?? ''}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                </figure>
                <p className="text-[12px] text-ink-faint mt-2">{product.brand_name}</p>
                <p className="text-[13.5px] font-semibold text-ink truncate">{product.name}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
