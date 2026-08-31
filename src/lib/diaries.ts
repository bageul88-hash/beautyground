import { supabase } from './supabase'

// 일기(살아가는 이야기) — 유저가 사진과 함께 일상을 남기면 diary_post 미션이 자동 적립된다.
// 적립은 화면에서 claim_mission을 따로 부르지 않고 create_diary RPC 안에서 한 번에 처리한다(누락·중복 방지).

export interface Diary {
  id: string
  user_id: string
  nickname: string | null
  content: string
  images: string[]
  like_count: number
  liked_by_me: boolean
  is_mine: boolean
  created_at: string
}

export interface BestDiary {
  id: string
  nickname: string | null
  content: string
  images: string[]
  like_count: number
  created_at: string
}

export type DiarySort = 'recent' | 'popular'

export async function getDiaryFeed(sort: DiarySort = 'recent', limit = 20, offset = 0): Promise<Diary[]> {
  const { data, error } = await supabase.rpc('get_diary_feed', {
    p_sort: sort, p_limit: limit, p_offset: offset,
  })
  if (error) return []
  return (data ?? []) as Diary[]
}

export async function getMonthlyBestDiaries(limit = 3): Promise<BestDiary[]> {
  const { data, error } = await supabase.rpc('get_monthly_best_diaries', { p_limit: limit })
  if (error) return []
  return (data ?? []) as BestDiary[]
}

export interface CreateDiaryResult {
  diary_id: string | null
  awarded: number
  message: string
}

export async function createDiary(
  content: string, images: string[] = [], nickname?: string | null
): Promise<CreateDiaryResult | null> {
  const { data, error } = await supabase.rpc('create_diary', {
    p_content: content, p_images: images, p_nickname: nickname ?? null,
  })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as CreateDiaryResult | null
}

export async function toggleDiaryLike(diaryId: string): Promise<{ liked: boolean; like_count: number } | null> {
  const { data, error } = await supabase.rpc('toggle_diary_like', { p_diary_id: diaryId })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as { liked: boolean; like_count: number } | null
}

export async function deleteDiary(diaryId: string): Promise<boolean> {
  const { error } = await supabase.from('diaries').delete().eq('id', diaryId)
  return !error
}

// ── 사진 업로드 ────────────────────────────────────────────────────────────
// Storage 용량(1GB)이 한정돼 있어 원본을 그대로 올리지 않는다. 긴 변 1080px webp로 줄여
// 상품 상세 이미지와 같은 product-images 버킷의 diaries/ 경로에 넣는다.
const MAX_EDGE = 1080

async function shrinkToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/webp', 0.8)
  )
}

export async function uploadDiaryImages(files: File[]): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const blob = await shrinkToWebp(files[i])
    const path = `diaries/${session.user.id}/${Date.now()}_${i}.webp`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, blob, { upsert: true, contentType: 'image/webp' })
    if (error) continue
    urls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
  }
  return urls
}
