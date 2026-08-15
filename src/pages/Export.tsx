import { useEffect, useState } from 'react'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import { supabase } from '../lib/supabase'
import { useShopBrands } from '../hooks/useShopBrands'
import { PRODUCT_CATEGORIES } from '../lib/types'
import { COMPANY_INFO } from '../lib/companyInfo'

// PRODUCT_CATEGORIES(한글, src/lib/types.ts)를 영문 라벨로 매핑 — 이 페이지만의 로컬 상수.
const CATEGORY_EN: Record<string, string> = {
  '스킨케어': 'Skincare',
  '메이크업': 'Makeup',
  '향수': 'Fragrance',
  '헤어·바디': 'Hair & Body',
  '이너뷰티': 'Inner Beauty',
  '뷰티 디바이스': 'Beauty Devices',
  '퍼퓸 디퓨저': 'Home Fragrance',
}

interface CatalogItem {
  id: string
  name: string
  thumbnail_url: string | null
  category: string | null
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
  const [items, setItems] = useState<CatalogItem[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [categories, setCategories] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.country.trim()) {
      setError('Please fill in company name, contact name, email, and country.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.')
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
      setError('Something went wrong. Please try again or email us directly.')
      return
    }
    setSubmitted(true)
    setForm(EMPTY_FORM)
    setCategories([])
  }

  return (
    <>
      <GNB />
      <main className="bg-paper">
        {/* Hero */}
        <section className="border-b border-rule px-6 py-20 sm:py-28 text-center">
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-5">
            For Global Buyers
          </p>
          <h1 className="text-[28px] sm:text-[40px] font-bold leading-[1.35] text-ink max-w-[760px] mx-auto">
            K-Beauty, Direct From
            <br />
            Our Own Portfolio
          </h1>
          <p className="text-ink-soft text-[15px] sm:text-[16px] leading-relaxed max-w-[600px] mx-auto mt-6">
            Beautyground operates department-store beauty shops and an online mall in Korea,
            and stocks {brands.length > 0 ? `${brands.length}+` : ''} K-Beauty brands as a direct buyer and reseller —
            not a listing marketplace. We can offer the same products, sourced and shipped by us,
            to your market.
          </p>
        </section>

        {/* Trust stats */}
        <section className="px-6 py-14 bg-quiet">
          <div className="max-w-[880px] mx-auto grid grid-cols-2 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">{brands.length > 0 ? `${brands.length}+` : '30+'}</p>
              <p className="text-ink-soft text-[12.5px] mt-1">Korean Beauty Brands</p>
            </div>
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">2022</p>
              <p className="text-ink-soft text-[12.5px] mt-1">Founded · Department Store Shops</p>
            </div>
            <div>
              <p className="text-[26px] sm:text-[30px] font-bold text-ink">Direct</p>
              <p className="text-ink-soft text-[12.5px] mt-1">Buy &amp; Resell — Not a Marketplace</p>
            </div>
          </div>
        </section>

        {/* Category showcase */}
        <section className="max-w-[1080px] mx-auto px-6 py-20">
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">Categories</p>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-ink mb-10">What We Carry</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {PRODUCT_CATEGORIES.map((cat) => (
              <div key={cat} className="border border-rule rounded-card px-4 py-5 text-center">
                <p className="text-[14px] font-semibold text-ink">{CATEGORY_EN[cat] ?? cat}</p>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {items.map((item) => (
                <figure key={item.id} className="rounded-card overflow-hidden border border-rule">
                  <img
                    src={item.thumbnail_url ?? ''}
                    alt={item.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          )}
        </section>

        {/* Inquiry form */}
        <section className="bg-quiet px-6 py-20">
          <div className="max-w-[560px] mx-auto">
            <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">Get In Touch</p>
            <h2 className="text-[24px] sm:text-[28px] font-bold text-ink mb-3">Request Our Catalog</h2>
            <p className="text-ink-soft text-[14px] leading-relaxed mb-10">
              Tell us a bit about your business and what you're looking for.
              Our team will reply within a few business days.
            </p>

            {submitted ? (
              <div className="bg-paper border border-rule rounded-card px-6 py-10 text-center">
                <p className="text-[16px] font-bold text-ink mb-2">Thank you!</p>
                <p className="text-[14px] text-ink-soft">
                  Your inquiry has been received. We'll be in touch at the email you provided.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="Company name *"
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                  <input
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Contact name *"
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email *"
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="Country *"
                  className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors"
                />

                <div>
                  <p className="text-[13px] text-ink-soft mb-2">Categories of interest</p>
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
                          {CATEGORY_EN[cat] ?? cat}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Message (optional) — volume, market, timeline, etc."
                  rows={4}
                  className="w-full px-4 py-3 border border-rule rounded-control text-[14px] text-ink placeholder:text-ink-faint bg-paper focus:outline-none focus:border-ink transition-colors resize-none"
                />

                {error && <p className="text-[13px] text-signal-red">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-paper rounded-control py-3.5 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send Inquiry'}
                </button>
              </form>
            )}

            <p className="text-[12.5px] text-ink-faint mt-8 text-center">
              Or email us directly at{' '}
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
