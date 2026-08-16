import type { VercelRequest, VercelResponse } from '@vercel/node'

// /company 링크 공유 시 미리보기(OG)를 쇼핑몰 네이밍 대신 회사소개서용으로 바꿔서 내보낸다.
// SPA라 라우트별 메타태그가 불가능하므로, 이 함수가 index.html을 받아 head 메타만 치환해 반환한다.
// (크롤러·사용자 모두 동일 HTML — 앱 번들이 그대로 로드되므로 화면은 기존 /company 페이지와 동일)

const OG_TITLE = 'LIFE IS BEAUTY'
const OG_DESC = '뷰티그라운드 회사소개서'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'beautyground.co.kr'
  const origin = `https://${host}`
  let html: string
  try {
    const r = await fetch(`${origin}/index.html`)
    html = await r.text()
  } catch (e) {
    console.error('[company-og] index.html fetch 실패:', e)
    res.setHeader('Location', '/')
    res.status(302).end()
    return
  }

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${OG_TITLE} | ${OG_DESC}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${OG_DESC}" />`)
    .replace(/<meta\s+property="og:site_name"[\s\S]*?\/>/, `<meta property="og:site_name" content="BEAUTYGROUND" />`)
    .replace(/<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${OG_TITLE}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${OG_DESC}" />`)
    .replace(/<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${origin}/company" />`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate')
  res.status(200).send(html)
}
