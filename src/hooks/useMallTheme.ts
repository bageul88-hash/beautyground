import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// 홈 테마 — /admin/theme에서 저장한 시그널 3색을 CSS 변수로 덮어쓴다.
// globals.css의 --signal-* 변수가 "R G B" 채널 형식이라 hex를 채널로 변환해 넣는다.
// theme 컬럼이 아직 없으면(supabase/home_theme.sql 미실행) 조용히 기본색을 쓴다.

export interface MallTheme {
  signalRed?: string
  signalBlue?: string
  signalYellow?: string
  // 라이브커머스 목록 화면(ShopLiveList) — "덩어리" 사이(지금 라이브 → LIVE 예고 → 지난 라이브) 간격(px).
  liveGap?: number
}

export const DEFAULT_THEME: Required<MallTheme> = {
  signalRed: '#E60012',
  signalBlue: '#0047FF',
  signalYellow: '#FFD400',
  liveGap: 32,
}

const VAR_MAP: Array<[keyof MallTheme, string]> = [
  ['signalRed', '--signal-red'],
  ['signalBlue', '--signal-blue'],
  ['signalYellow', '--signal-yellow'],
]

export function hexToChannels(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function applyMallTheme(theme: MallTheme | null) {
  const root = document.documentElement
  for (const [key, cssVar] of VAR_MAP) {
    const channels = theme?.[key] ? hexToChannels(theme[key] as string) : null
    if (channels) root.style.setProperty(cssVar, channels)
    else root.style.removeProperty(cssVar)
  }
  if (typeof theme?.liveGap === 'number' && Number.isFinite(theme.liveGap)) {
    root.style.setProperty('--live-gap', `${theme.liveGap}px`)
  } else {
    root.style.removeProperty('--live-gap')
  }
}

// 관리자 미리보기: /?themePreview=<URI인코딩 JSON> 로 열리면 DB 대신 그 값을 쓴다.
export function readPreviewTheme(): MallTheme | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('themePreview')
    if (!raw) return null
    const parsed = JSON.parse(raw) as MallTheme
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

export function useMallTheme() {
  useEffect(() => {
    const preview = readPreviewTheme()
    if (preview) {
      applyMallTheme(preview)
      return
    }
    let active = true
    void (async () => {
      const { data, error } = await supabase
        .from('home_settings')
        .select('theme')
        .eq('id', 1)
        .maybeSingle()
      if (!active || error) return
      applyMallTheme((data?.theme as MallTheme | null) ?? null)
    })()
    return () => {
      active = false
    }
  }, [])
}
