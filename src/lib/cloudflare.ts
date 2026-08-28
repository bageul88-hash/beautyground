// Cloudflare Stream 설정 — 한 곳에서 관리
// 하위 도메인(공개 재생 도메인, 비밀 아님). 환경변수로 덮어쓸 수 있음.
export const CF_STREAM_SUBDOMAIN =
  (import.meta.env.VITE_CF_STREAM_SUBDOMAIN as string | undefined) ||
  'customer-musyiv3qecrzgpdk'

// stream_uid → Cloudflare Stream iframe 재생 주소 (없으면 null)
// 시청자가 링크로 들어오면 재생 버튼을 누르지 않아도 바로 방송이 나오게 autoplay 를 켠다.
// 다만 브라우저(특히 모바일)는 "소리 있는 자동재생"을 차단하므로 muted 로 시작해야 실제로 재생된다
// — 유튜브·틱톡과 같은 방식으로, 화면을 탭하면 muted=false 로 다시 불러 소리를 켠다.
export function streamIframeSrc(
  uid: string | null | undefined,
  opts: { autoplay?: boolean; muted?: boolean } = {}
): string | null {
  if (!uid) return null
  const { autoplay = true, muted = true } = opts
  const q = new URLSearchParams()
  if (autoplay) q.set('autoplay', 'true')
  if (muted) q.set('muted', 'true')
  const qs = q.toString()
  return `https://${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${uid}/iframe${qs ? `?${qs}` : ''}`
}
