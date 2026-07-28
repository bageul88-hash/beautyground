import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        // 맑은고딕으로 통일(대표님 지시) — Windows는 실제 맑은고딕, Mac은 Apple SD 고딕Neo,
        // 폰트 파일 자체를 배포하는 게 아니라 시스템에 이미 설치된 폰트를 이름으로 참조하는 방식이라 저작권 문제 없음.
        // 둘 다 없는 환경(구형 안드로이드 등) 대비 Noto Sans KR을 웹폰트 폴백으로 마지막에 유지.
        sans: ['"맑은 고딕"', '"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif'],
        serif: ['"맑은 고딕"', '"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        pill: '999px',
      },
      boxShadow: {
        focus: '0 0 0 2px #b8924a',
      },
    },
  },
  plugins: [],
}

export default config
