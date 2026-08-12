import type { Live } from '../../lib/types'
import { useStreamStatus } from '../../hooks/useStreamStatus'

// 실제 송출 연결 상태를 반영하는 라이브 배지.
// status='live'여도 송출이 안 들어오고 있으면 '준비중'으로 표시해 거짓 LIVE를 막는다.
// (송출 채널이 아예 없는 live 상태도 준비중으로 취급. 상태조회 실패 시에는
//  실방송을 잘못 가리지 않도록 LIVE 쪽으로 판정한다.)
export default function LiveStatusBadge({
  live,
  size = 'md',
  variant = 'square',
}: {
  live: Live
  size?: 'sm' | 'md'
  // 'pill' — 라이브커머스 메인 목록 카드 전용 그라디언트 알약 배지(2026-08-10, 대표님 지시로
  // 레퍼런스 시안 룩을 그대로 입힘). 다른 화면(데스크톱·시청페이지)은 기존 각진 배지 유지.
  variant?: 'square' | 'pill'
}) {
  const stream = useStreamStatus(live.stream_uid, live.status === 'live')
  const pad = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[12px] px-2.5 py-1'
  const dot = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const base = `inline-flex items-center rounded-control font-bold tracking-[0.04em] ${pad}`

  if (live.status === 'live') {
    const onAir = Boolean(live.stream_uid) && stream !== 'disconnected'
    if (onAir) {
      if (variant === 'pill') {
        return (
          <span className="inline-flex items-center gap-[5px] text-white text-[10.5px] font-extrabold tracking-[0.02em] px-[9px] py-1 rounded-full bg-gradient-to-r from-live-start to-live-end">
            <span className="flex items-end gap-[1.5px] h-[9px]" aria-hidden="true">
              <span className="block w-[2px] rounded-[1px] bg-white" style={{ height: '40%' }} />
              <span className="block w-[2px] rounded-[1px] bg-white" style={{ height: '100%' }} />
              <span className="block w-[2px] rounded-[1px] bg-white" style={{ height: '65%' }} />
            </span>
            LIVE
          </span>
        )
      }
      // 빨강은 "지금 벌어지는 일"에만 — 실제 송출이 들어오고 있을 때만 켜진다.
      return (
        <span className={`${base} gap-1.5 bg-signal-red text-paper`}>
          <span className={`${dot} onair-dot rounded-full bg-paper`} aria-hidden="true" />
          LIVE
        </span>
      )
    }
    if (variant === 'pill') return <span className="inline-flex items-center rounded-full bg-bg-overlay/70 text-white text-[10.5px] font-bold px-[9px] py-1">준비중</span>
    return <span className={`${base} bg-ink text-paper`}>준비중</span>
  }

  if (variant === 'pill') {
    return (
      <span className="inline-flex items-center rounded-full bg-bg-overlay/70 text-white text-[10.5px] font-bold px-[9px] py-1">
        {live.status === 'scheduled' ? '예정' : '종료'}
      </span>
    )
  }
  return (
    <span className={`${base} bg-ink text-paper`}>
      {live.status === 'scheduled' ? '예정' : '종료'}
    </span>
  )
}
