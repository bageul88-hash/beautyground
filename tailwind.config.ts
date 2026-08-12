import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── 새 비주얼 월드 "생방송 슬레이트" (DESIGN.md) ──
        // 흰 바탕 + 원색 3개. 색은 사실을 말할 때만 켜진다:
        // 빨강=지금 벌어지는 일 / 파랑=확정된 정보·행동 / 노랑=조건부 혜택.
        paper: '#FFFFFF',
        ink: {
          DEFAULT: '#17181C', // 본문·기본 버튼 바탕 (순검정 아닌 먹색)
          soft: '#5B5E66', // 보조 설명·브랜드명
          faint: '#8E9199', // 캡션·단위·플레이스홀더
        },
        rule: '#E3E5E9', // 면을 나누는 1px 선 — 이 시스템의 유일한 구획 수단
        quiet: '#F4F5F7', // 입력·비활성 등 눌린 면
        signal: {
          // 실제 색은 globals.css의 CSS 변수("R G B" 채널) — /admin/theme에서 런타임 교체 가능
          red: 'rgb(var(--signal-red) / <alpha-value>)',
          blue: 'rgb(var(--signal-blue) / <alpha-value>)',
          yellow: 'rgb(var(--signal-yellow) / <alpha-value>)',
        },

        // ── 피그마 레퍼런스 팔레트(쇼핑몰예시.jpg 픽셀 실측, 2026-08-08) ──
        // 히어로 카드·할인칩·찜(찜한 상태)·구매 CTA 등 "그린 액센트"가 쓰이는 자리에만 사용.
        // 결제 버튼(장바구니 주문·체크아웃)은 레퍼런스에서도 검정(ink) — 액션의 무게가 다르다.
        accent: {
          DEFAULT: '#81D14C',
          deep: '#5FB82E', // 호버·강조 텍스트
          lite: '#E7F6D9', // 칩·배지 옅은 배경
          ink: '#2E7D0F', // lite 배경 위 텍스트
        },
        hero: {
          1: '#6DB33F',
          2: '#94D64F',
        },

        // ── 구 골드 월드 (폐기 대상) ──
        // 아직 전환되지 않은 화면들이 참조 중이라 남겨둔다. 화면을 하나씩
        // 새 월드로 옮기면서 제거할 것 — 신규 작업에서 새로 쓰지 말 것.
        gold: {
          DEFAULT: '#b8924a',
          light: '#d4af6e',
          dim: '#7a6030',
        },
        dark: {
          DEFAULT: '#0e0c08',
          2: '#1a1710',
          3: '#1a1208',
          footer: '#0a0907',
        },
        cream: {
          DEFAULT: '#f7f4ef',
          2: '#edeae3',
          3: '#f0ede8',
          4: '#f4f2f0',
        },
        text: {
          DEFAULT: '#1a1710',
          sub: '#5a5547',
          hint: '#9a9080',
        },
        dept: {
          lotte: {
            bg: '#FAECE7',
            text: '#712B13',
            accent: '#D85A30',
          },
          shinsegae: {
            bg: '#E1F5EE',
            text: '#085041',
            accent: '#1D9E75',
          },
          hyundai: {
            bg: '#EEEDFE',
            text: '#3C3489',
            accent: '#7F77DD',
          },
        },
        category: {
          skincare: { bg: '#FBEAF0', text: '#993556' },
          makeup: { bg: '#EEEDFE', text: '#534AB7' },
          perfume: { bg: '#E1F5EE', text: '#0F6E56' },
          hair: { bg: '#FAEEDA', text: '#854F0B' },
          body: { bg: '#E6F1FB', text: '#185FA5' },
        },

        // ── 목업(live-commerce-new) 팔레트 그대로 이식 (2026-08-12, 대표님 지시로 라이브 메인이
        // 이 톤을 최우선으로 가져감) — 목업 src/designTokens.js와 값 1:1 동일하게 유지할 것.
        'brand-pink': '#FF2D87',
        'live-start': '#FF4444',
        'live-end': '#FF6B6B',
        'bg-overlay': '#1f1f1f',
        'card-border': 'rgba(0,0,0,0.08)',
        'star-gold': '#FFB800',
        'brand-tile-1': '#FDEBF3',
        'brand-tile-2': '#E8F3FF',
        'brand-tile-3': '#FFF3E0',
        'brand-tile-4': '#E9F7EF',
        'brand-tile-5': '#F3EFFF',
      },
      fontFamily: {
        // 맑은고딕으로 통일(대표님 지시) — Windows는 실제 맑은고딕, Mac은 Apple SD 고딕Neo,
        // 폰트 파일 자체를 배포하는 게 아니라 시스템에 이미 설치된 폰트를 이름으로 참조하는 방식이라 저작권 문제 없음.
        // 둘 다 없는 환경(구형 안드로이드 등) 대비 Noto Sans KR을 웹폰트 폴백으로 마지막에 유지.
        sans: ['"맑은 고딕"', '"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif'],
        serif: ['"맑은 고딕"', '"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif'],
      },
      borderRadius: {
        // 새 월드: 면은 직각(0), 손으로 누르는 것만 4px. 그 외 값은 구 월드 잔재.
        field: '0px',
        control: '4px',
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        pill: '999px',
        // 피그마 레퍼런스 카드 라운드(히어로·상품카드·상세 갤러리)
        card: '18px',
      },
      boxShadow: {
        focus: '0 0 0 2px #b8924a', // 구 월드
        ring: '0 0 0 2px #FFFFFF, 0 0 0 4px #0047FF', // 새 월드 포커스 링(2px 띄운 파랑)
        // 피그마 레퍼런스 카드 그림자(둥근 세계 전용, 기존 직각 카드에는 쓰지 않음)
        card: '0 8px 24px rgba(23,24,28,0.10)',
      },
    },
  },
  plugins: [],
}

export default config
