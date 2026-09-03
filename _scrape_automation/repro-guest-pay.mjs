import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const OUT = 'C:/Users/user/AppData/Local/Temp/claude/C--Users-user/f882b3b7-1c1b-4222-91de-b2593eb2d43a/scratchpad/inicis'
mkdirSync(OUT, { recursive: true })
const PID = '55b4cea6-a9d2-4755-a28e-38e1a00f5716'
const b = await chromium.launch({ headless: false })
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: 'ko-KR' })
const p = await ctx.newPage()
const logs = []
p.on('console', m => { if (['error','warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text().slice(0,300)}`) })
p.on('pageerror', e => logs.push(`[pageerror] ${e.message}`))
p.on('requestfailed', r => logs.push(`[reqfail] ${r.url().slice(0,140)} :: ${r.failure()?.errorText}`))
p.on('response', r => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url().slice(0,160)}`) })
ctx.on('page', np => console.log('>>> NEW PAGE/POPUP:', np.url()))

await p.goto(`https://beautyground.co.kr/app/product/${PID}`, { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
await p.getByRole('button', { name: '구매하기' }).first().click()
await p.waitForTimeout(2000)
await p.getByPlaceholder('받는 분 성함').fill('테스트')
await p.getByPlaceholder('연락처 (010-0000-0000)').fill('010-3385-4302')
await p.getByPlaceholder('이메일 (결제 영수증·주문 안내 발송)').fill('beautyground.official@gmail.com')
await p.getByRole('button', { name: '주소 검색' }).first().click()
await p.waitForTimeout(2500)
const daum = p.frames().find(f => f.url().includes('postcode'))
await daum.fill('input[type=text]', '성남대로 345')
await daum.press('input[type=text]', 'Enter')
await p.waitForTimeout(2500)
const first = await daum.$('.list_post li a, #list dl dd a, .link_post')
if (first) { await first.click(); await p.waitForTimeout(1500) }
console.log('ADDR:', await p.getByPlaceholder('주소 검색을 눌러주세요').inputValue())

// ===== 결제하기 (결제창 호출까지만 — 카드 승인 진행 안 함) =====
const payBtn = p.locator('button', { hasText: '결제하기' }).last()
console.log('PAY BUTTON:', (await payBtn.innerText()).trim())
await payBtn.click()
await p.waitForTimeout(8000)
await p.screenshot({ path: `${OUT}/s6_after_pay.png`, fullPage: true })
console.log('URL:', p.url())
console.log('---- PAGE TEXT AFTER PAY ----')
console.log((await p.evaluate(() => document.body.innerText)).slice(0, 1500))
console.log('---- FRAMES ----')
console.log(JSON.stringify(p.frames().map(f => f.url()).filter(u => u && u !== 'about:blank')))
console.log('---- PAGES ----')
console.log(JSON.stringify(ctx.pages().map(x => x.url())))
console.log('---- LOGS ----')
console.log(logs.join('\n'))
await b.close()
