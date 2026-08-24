import { useState, type CSSProperties } from 'react'

// 상품 이미지(보통 70~600KB, 리사이즈 안 됨)를 지정 크기까지 축소·webp 압축해서 불러온다.
// Supabase Storage에 올라간 이미지(현재 전 상품이 여기 해당)는 Supabase 자체 이미지 변환
// 엔드포인트(render/image)를 쓴다 — 같은 오리진이라 외부 프록시보다 훨씬 빠르고 안정적.
// 그 외 외부 호스팅 이미지만 무료 프록시(wsrv.nl)로 축소한다.
// 배경: 2026-08-21 4G 환경 실측 — 홈 화면 첫 진입에 이미지만 3.57MB(24장), 느린 모바일
// 환경에서 체감 로딩이 오래 걸린다는 리포트로 도입. 이후 wsrv.nl 단독 적용 시 콜드 요청이
// 최대 3초까지 걸리는 게 확인돼(2026-08-24) Supabase 자체 변환으로 전환.
function optimizedSrc(url: string, size: number): string {
  if (url.startsWith('/') || url.startsWith('data:') || url.includes('wsrv.nl')) return url
  if (url.includes('/storage/v1/object/public/')) {
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    const sep = renderUrl.includes('?') ? '&' : '?'
    return `${renderUrl}${sep}width=${size}&height=${size}&resize=cover&quality=78`
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=webp&q=78`
}

interface ThumbProps {
  src: string | null | undefined
  alt: string
  size?: number
  className?: string
  loading?: 'lazy' | 'eager'
  style?: CSSProperties
}

export default function Thumb({ src, alt, size = 400, className, loading = 'lazy', style }: ThumbProps) {
  const [failed, setFailed] = useState(false)
  if (!src) return null
  return (
    <img
      src={failed ? src : optimizedSrc(src, size)}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
      onError={() => {
        if (!failed) setFailed(true)
      }}
    />
  )
}
