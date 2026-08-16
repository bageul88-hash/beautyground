// CURATED BY BEAUTYGROUND 원형 인장 — 수출 채널의 시그니처(직매입 유통사의 보증 도장).
// 바이어 미니페이지(/x)와 브랜드 편집기 미리보기가 공용으로 사용한다.
export default function CuratorSeal({ size = 92 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="seal" aria-hidden>
      <defs>
        <path id="sealArc" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#A8853F" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="29" fill="none" stroke="#A8853F" strokeWidth="0.8" />
      <text fill="#A8853F" fontSize="8.2" letterSpacing="1.8" fontFamily="Georgia, 'Noto Serif KR', serif">
        <textPath href="#sealArc">CURATED · BEAUTYGROUND · SEOUL · EXPORT ·</textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fill="#A8853F" fontSize="15" fontFamily="Georgia, 'Noto Serif KR', serif">BG</text>
      <text x="50" y="60" textAnchor="middle" fill="#A8853F" fontSize="5.4" letterSpacing="1.2">EST. 2022</text>
    </svg>
  )
}
