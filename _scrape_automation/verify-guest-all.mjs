// 비회원 구매 전 동선 검증 — PC/모바일 × 바로구매/장바구니. 결제창 호출까지만.
import { chromium, devices } from 'playwright'
import { mkdirSync } from 'fs'
const OUT = 'C:/Users/user/AppData/Local/Temp/claude/C--Users-user/f882b3b7-1c1b-4222-91de-b2593eb2d43a/scratchpad/inicis'
mkdirSync(OUT, { recursive: true })
const BASE = process.argv[2] || 'http://localhost:5173'
const PID = '55b4cea6-a9d2-4755-a28e-38e1a00f5716'
const results = []

async function fillAddress(p) {
  await p.getByPlaceholder('받는 분 성함').fill('테스트')
  await p.getByPlaceholder('연락처 (010-0000-0000)').fill('010-3385-4302')
  const em = p.getByPlaceholder('이메일 (결제 영수증·주문 안내 발송)')
  if (await em.count()) await em.fill('beautyground.official@gmail.com')
  else return '이메일칸 없음'
  await p.getByRole('button', { name: '주소 검색' }).first().click()
  await p.waitForTimeout(2500)
  const daum = p.frames().find(f => f.url().includes('postcode'))
  if (!daum) return '주소검색 iframe 없음'
  await daum.fill('input[type=text]', '성남대로 345')
  await daum.press('input[type=text]', 'Enter')
  await p.waitForTimeout(2500)
  const first = await daum.$('.list_post li a, #list dl dd a, .link_post')
  if (first) { await first.click(); await p.waitForTimeout(1500) }
  return null
}

async function run(label, ctxOpts, viaCart) {
  const b = await chromium.launch({ headless: false })
  const ctx = await b.newContext({ ...ctxOpts, locale: 'ko-KR' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(`pageerror: ${e.message}`))
  p.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(`http ${r.status()} ${r.url().slice(0,110)}`) })
  let verdict = ''
  try {
    await p.goto(`${BASE}/app/product/${PID}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1200)
    if (viaCart) {
      // 담기 버튼: 모바일은 아이콘(aria-label='장바구니 담기'), PC는 텍스트 '장바구니'.
      // 헤더의 장바구니 아이콘도 같은 이름으로 잡히므로 마지막 것을 쓴다.
      const addBtn = p.getByLabel('장바구니 담기')
      if (await addBtn.count()) await addBtn.last().click()
      else await p.getByRole('button', { name: '장바구니', exact: true }).last().click()
      await p.waitForTimeout(1500)
      const stored = await p.evaluate(() => localStorage.getItem('bg_guest_cart'))
      if (!stored || stored === '[]') { verdict = '❌ 비회원 장바구니 담기 실패'; throw new Error(verdict) }
      await p.waitForTimeout(1500)
      await p.goto(`${BASE}/app/cart`, { waitUntil: 'networkidle' })
      await p.waitForTimeout(1800)
      const order = p.locator('button').filter({ hasText: /주문|결제하기/ }).last()
      if (!(await order.count())) { verdict = '❌ 장바구니에 주문하기 버튼 없음'; throw new Error(verdict) }
      await order.click()
      await p.waitForTimeout(2500)
      if (p.url().includes('/app/login')) { verdict = '❌ 로그인 페이지로 튕김(비회원 구매 불가)'; throw new Error(verdict) }
    } else {
      await p.getByRole('button', { name: '구매하기' }).first().click()
      await p.waitForTimeout(2200)
      if (p.url().includes('/app/login')) { verdict = '❌ 로그인 페이지로 튕김'; throw new Error(verdict) }
    }
    const bad = await fillAddress(p)
    if (bad) { verdict = `❌ ${bad}`; throw new Error(verdict) }
    await p.locator('button', { hasText: '결제하기' }).last().click()
    await p.waitForTimeout(9000)
    const frames = p.frames().map(f => f.url())
    const pages = ctx.pages().map(x => x.url())
    const inicis = [...frames, ...pages].some(u => u.includes('inicis.com'))
    const body = await p.evaluate(() => document.body.innerText)
    const failMsg = (body.match(/결제 창 호출에 실패[^\n]*/) || body.match(/실패[^\n]*/) || [])[0]
    verdict = inicis ? '✅ KG이니시스 결제창 정상 호출' : `❌ 결제창 미호출 — ${failMsg || '원인 미상'}`
    await p.screenshot({ path: `${OUT}/v_${label}.png` })
  } catch (e) {
    if (!verdict) verdict = `❌ ${e.message.slice(0, 120)}`
    await p.screenshot({ path: `${OUT}/v_${label}.png` }).catch(() => {})
  }
  results.push({ label, verdict, errs: errs.slice(0, 3) })
  await b.close()
}

await run('PC_바로구매', { viewport: { width: 1360, height: 900 } }, false)
await run('PC_장바구니', { viewport: { width: 1360, height: 900 } }, true)
await run('모바일_바로구매', { ...devices['iPhone 13'] }, false)
await run('모바일_장바구니', { ...devices['iPhone 13'] }, true)

console.log('\n================ 비회원 구매 동선 검증 (' + BASE + ') ================')
for (const r of results) {
  console.log(`${r.label.padEnd(16)} ${r.verdict}`)
  r.errs.forEach(e => console.log(`                 · ${e}`))
}
