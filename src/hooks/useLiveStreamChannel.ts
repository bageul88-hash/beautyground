import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface StreamInfo {
  uid: string
  rtmpsUrl: string | null
  streamKey: string | null
}

// 방송 송출 채널(Cloudflare Live Input) 발급/조회 — 브랜드(파트너) LiveDetail, 진행자(host)
// LiveSales 양쪽에서 공용으로 쓰는 훅. 서버(api/live-input.ts)가 요청자 본인 확인을 하므로
// 여기서는 세션 토큰만 실어 보낸다.
export function useLiveStreamChannel(liveId: string | undefined, hasChannel: boolean) {
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null)
  const [streamErr, setStreamErr] = useState('')
  const [provisioning, setProvisioning] = useState(false)

  const callLiveInput = async (method: 'GET' | 'POST'): Promise<StreamInfo | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token || !liveId) {
      setStreamErr('로그인이 필요합니다.')
      return null
    }
    try {
      const res = await fetch(method === 'GET' ? `/api/live-input?liveId=${liveId}` : '/api/live-input', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ liveId }) : undefined,
      })
      const j = (await res.json().catch(() => ({}))) as Partial<StreamInfo> & { reason?: string }
      // uid 없는 응답(비JSON 200 포함)도 실패로 처리 — 빈 값('-')을 조용히 표시하지 않는다
      if (!res.ok || !j.uid) {
        setStreamErr(j.reason ?? '송출 정보 조회에 실패했습니다.')
        return null
      }
      setStreamErr('')
      return j as StreamInfo
    } catch {
      setStreamErr('송출 정보 조회에 실패했습니다.')
      return null
    }
  }

  // 채널이 이미 있으면 송출 주소·키 자동 로드
  useEffect(() => {
    if (!hasChannel || !liveId) return
    let active = true
    callLiveInput('GET').then((info) => {
      if (active && info) setStreamInfo(info)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, hasChannel])

  const createChannel = async () => {
    if (provisioning) return null
    setProvisioning(true)
    const info = await callLiveInput('POST')
    if (info) setStreamInfo(info)
    setProvisioning(false)
    return info
  }

  return { streamInfo, streamErr, provisioning, createChannel }
}
