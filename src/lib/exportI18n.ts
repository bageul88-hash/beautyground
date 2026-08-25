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

// 이 페이지들은 해외 바이어 전용이라 브라우저 언어 자동감지 없이 항상 영어로 시작한다
// (2026-08-26 확정) — 필요하면 언어 스위처로 직접 바꾼다.
export function detectLang(): Lang {
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
