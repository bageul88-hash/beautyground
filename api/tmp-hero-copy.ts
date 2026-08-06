import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TEMP_SECRET = '5e9a1c7f3b6d0248ac7e2f9b4d6a1c805e3f7b9d2a6c410f'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const COPY: Record<string, { headline: string; subcopy: string }> = {
  'df3acb66-56a9-4055-a19e-7d7407d2c7de': { headline: '지금이 가장 저렴한 타이밍', subcopy: 'BYLIMU 에이지 홀딩 앰플 30% 할인 중' },
  '360003b1-2509-433e-876e-e205193ff27e': { headline: '무너진 목주름, 골드 한 방울로', subcopy: '탄력 집중 케어 넥크림' },
  'd7a6bf1d-b8af-4ffe-95cf-c81cd1867a50': { headline: '선쿠션+팩트, 반값에', subcopy: '메이크업헬퍼 비건 에센스 세트 51% 할인' },
  '94f50ce5-86dc-46fc-ba18-b65f3c773a9f': { headline: '매일 쓰는 토너, 제대로 골랐나요', subcopy: '뷰티파잉 저자극 토너' },
  '6454406e-b96b-4532-9574-1e98199a0f39': { headline: '지친 피부에 진정 한 스푼', subcopy: '수딩 토너 200ml' },
  'eaf30e66-062f-49ae-a25a-44cbbcd02580': { headline: '온 가족 바디워시, 대용량으로', subcopy: '퓨어 모이스처 바디워시 750ml' },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({}); return }
  if (!SERVICE_ROLE) { res.status(500).json({ error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const results: Record<string, string> = {}
  for (const [id, copy] of Object.entries(COPY)) {
    const { error } = await supabase.from('hero_banners').update(copy).eq('id', id)
    results[id] = error ? error.message : 'ok'
  }
  res.status(200).json(results)
}
