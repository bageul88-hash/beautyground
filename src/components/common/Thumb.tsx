import { useState, type CSSProperties } from 'react'

// 브랜드사 외부 서버에 그대로 걸린 원본 상품 이미지(보통 70~600KB, 리사이즈 안 됨)를 무료
// 이미지 프록시(wsrv.nl)로 지정 크기까지 축소·webp 압축해서 불러온다. 프록시가 응답하지
// 않으면(onError) 자동으로 원본 URL로 다시 시도해, 이 프록시가 장애 나도 "이미지가 아예
// 안 뜨는" 최악의 상황은 막는다.
// 배경: 2026-08-21 4G 환경 실측 — 홈 화면 첫 진입에 이미지만 3.57MB(24장), 카카오톡
// 인앱 브라우저 등 느린 모바일 환경에서 체감 로딩이 오래 걸린다는 리포트로 도입.
function optimizedSrc(url: string, size: number): string {
  if (url.startsWith('/') || url.startsWith('data:') || url.includes('wsrv.nl')) return url
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
