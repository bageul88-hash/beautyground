// /export, /export/products, /export/products/:id 가 공유하는 언어 설정.
// 페이지별 문구(Copy)는 각 페이지 파일에 따로 두고, 여기서는 언어 목록·감지·카테고리
// 번역처럼 여러 페이지가 그대로 재사용하는 것만 둔다.

export type Lang = 'ko' | 'en' | 'ja' | 'zh' | 'es'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
]

// 브라우저 언어를 감지해 초기 표시 언어를 정한다(못 찾으면 영어 — 해외 바이어가 주 타깃).
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const nl = navigator.language?.toLowerCase() ?? ''
  if (nl.startsWith('ko')) return 'ko'
  if (nl.startsWith('ja')) return 'ja'
  if (nl.startsWith('zh')) return 'zh'
  if (nl.startsWith('es')) return 'es'
  return 'en'
}

// PRODUCT_CATEGORIES(한글, src/lib/types.ts)를 언어별로 매핑.
export const CATEGORY_I18N: Record<Lang, Record<string, string>> = {
  ko: {
    '스킨케어': '스킨케어',
    '메이크업': '메이크업',
    '향수': '향수',
    '헤어·바디': '헤어·바디',
    '이너뷰티': '이너뷰티',
    '뷰티 디바이스': '뷰티 디바이스',
    '퍼퓸 디퓨저': '퍼퓸 디퓨저',
  },
  en: {
    '스킨케어': 'Skincare',
    '메이크업': 'Makeup',
    '향수': 'Fragrance',
    '헤어·바디': 'Hair & Body',
    '이너뷰티': 'Inner Beauty',
    '뷰티 디바이스': 'Beauty Devices',
    '퍼퓸 디퓨저': 'Home Fragrance',
  },
  ja: {
    '스킨케어': 'スキンケア',
    '메이크업': 'メイク',
    '향수': '香水',
    '헤어·바디': 'ヘア・ボディ',
    '이너뷰티': 'インナービューティー',
    '뷰티 디바이스': 'ビューティーデバイス',
    '퍼퓸 디퓨저': 'ホームフレグランス',
  },
  zh: {
    '스킨케어': '护肤',
    '메이크업': '彩妆',
    '향수': '香水',
    '헤어·바디': '洗护身体',
    '이너뷰티': '美容内服',
    '뷰티 디바이스': '美容仪器',
    '퍼퓸 디퓨저': '家居香氛',
  },
  es: {
    '스킨케어': 'Cuidado de la Piel',
    '메이크업': 'Maquillaje',
    '향수': 'Fragancias',
    '헤어·바디': 'Cabello y Cuerpo',
    '이너뷰티': 'Belleza Interior',
    '뷰티 디바이스': 'Dispositivos de Belleza',
    '퍼퓸 디퓨저': 'Fragancia para el Hogar',
  },
}
