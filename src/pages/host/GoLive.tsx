import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import { useStreamStatus } from '../../hooks/useStreamStatus'

// 로그인 없이 "링크 하나로 방송 송출" — 진행자가 카톡 등으로 받은 링크를 열면 바로
// 브라우저 카메라로 방송을 시작할 수 있다(별도 앱 설치·주소/키 복붙 불필요).
// 인증은 URL의 토큰(lives.host_token) 하나로 대체 — supabase/lives_host_token.sql 참고.
type StreamInfo = { uid: string; webRtcUrl: string | null }

async function waitIceGatheringComplete(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === 'complete') return
  await new Promise<void>((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
    // WHIP 협상이 카메라 권한 지연 등으로 오래 걸리지 않도록 안전장치(3초 초과시 그냥 진행)
    setTimeout(resolve, 3000)
  })
}

export default function HostGoLive() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [live, setLive] = useState<Live | null>(null)

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastErr, setBroadcastErr] = useState('')
  const [camReady, setCamReady] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  // 폰을 거꾸로(180도) 거치했을 때 시청자에게 보내는 화면만 바로잡는 용도 — 로컬 미리보기는
  // CSS로만 뒤집고(실제 데이터는 그대로), 송출용은 캔버스에 180도 회전해서 그린 뒤 그 캔버스를
  // 새 트랙으로 만들어 RTCRtpSender.replaceTrack으로 갈아끼운다(재협상 없이 끊김 없이 전환).
  const flipCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const flipStreamRef = useRef<MediaStream | null>(null)
  const flipRafRef = useRef<number | null>(null)

  const streamState = useStreamStatus(live?.stream_uid, live?.status !== 'ended', 5000)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!token) { setError('잘못된 링크입니다.'); setLoading(false); return }
      const { data, error: rpcErr } = await supabase.rpc('get_live_by_host_token', { p_token: token })
      if (!active) return
      if (rpcErr || !data) {
        setError(rpcErr?.message ?? '유효하지 않은 링크입니다.')
        setLoading(false)
        return
      }
      const lr = data as Live
      setLive(lr)
      if (lr.stream_uid) {
        const res = await fetch(`/api/live-input?hostToken=${encodeURIComponent(token)}`)
        const j = (await res.json().catch(() => ({}))) as Partial<StreamInfo> & { reason?: string }
        if (active && res.ok && j.uid) setStreamInfo(j as StreamInfo)
      }
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [token])

  const createChannel = async () => {
    if (!token || provisioning) return
    setProvisioning(true)
    setBroadcastErr('')
    const res = await fetch('/api/live-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken: token }),
    })
    const j = (await res.json().catch(() => ({}))) as Partial<StreamInfo> & { reason?: string }
    setProvisioning(false)
    if (!res.ok || !j.uid) {
      setBroadcastErr(j.reason ?? '송출 채널 생성에 실패했습니다.')
      return
    }
    setStreamInfo(j as StreamInfo)
  }

  const openCamera = async () => {
    setBroadcastErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamReady(true)
    } catch {
      setBroadcastErr('카메라·마이크 권한을 허용해야 방송을 시작할 수 있습니다.')
    }
  }

  const startFlipLoop = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    flipCanvasRef.current = canvas
    const draw = () => {
      if (ctx && video) {
        ctx.save()
        ctx.translate(canvas.width, canvas.height)
        ctx.rotate(Math.PI)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
      flipRafRef.current = requestAnimationFrame(draw)
    }
    draw()
    flipStreamRef.current = canvas.captureStream(30)
  }

  const stopFlipLoop = () => {
    if (flipRafRef.current) cancelAnimationFrame(flipRafRef.current)
    flipRafRef.current = null
    flipStreamRef.current = null
    flipCanvasRef.current = null
  }

  // 거치 방향을 뒤집었을 때 누르는 버튼 — 로컬 미리보기(CSS)와 실제 송출 트랙(캔버스) 둘 다 전환.
  // 이미 방송 중이면 RTCRtpSender.replaceTrack으로 즉시 교체(재협상 없음, 시청자 쪽 끊김 없음).
  const toggleFlip = async () => {
    const next = !flipped
    setFlipped(next)
    if (next) {
      startFlipLoop()
      await new Promise((r) => setTimeout(r, 100))
      const newTrack = flipStreamRef.current?.getVideoTracks()[0]
      if (newTrack && pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
        await sender?.replaceTrack(newTrack)
      }
    } else {
      const originalTrack = streamRef.current?.getVideoTracks()[0]
      if (originalTrack && pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video')
        await sender?.replaceTrack(originalTrack)
      }
      stopFlipLoop()
    }
  }

  const startBroadcast = async () => {
    if (!token || !streamInfo?.webRtcUrl || !streamRef.current) return
    setBroadcastErr('')
    try {
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      const outgoingVideoTrack = flipped
        ? flipStreamRef.current?.getVideoTracks()[0] ?? streamRef.current.getVideoTracks()[0]
        : streamRef.current.getVideoTracks()[0]
      if (outgoingVideoTrack) pc.addTrack(outgoingVideoTrack, streamRef.current)
      streamRef.current.getAudioTracks().forEach((t) => pc.addTrack(t, streamRef.current!))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitIceGatheringComplete(pc)

      const res = await fetch(streamInfo.webRtcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription?.sdp ?? '',
      })
      if (!res.ok) throw new Error('송출 서버 연결에 실패했습니다.')
      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      // 실제 송출이 열렸으니 시청 화면에 노출되도록 상태 전환
      await fetch('/api/live-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: token, markLive: true }),
      }).catch(() => {})
      setLive((prev) => (prev ? { ...prev, status: 'live' } : prev))

      setBroadcasting(true)
    } catch {
      setBroadcastErr('방송 시작에 실패했습니다. 다시 시도해 주세요.')
      pcRef.current?.close()
      pcRef.current = null
    }
  }

  const stopBroadcast = () => {
    pcRef.current?.close()
    pcRef.current = null
    setBroadcasting(false)
  }

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      stopFlipLoop()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f4]">
        <p className="text-[14px] text-[#9a9080]">불러오는 중...</p>
      </div>
    )
  }

  if (error || !live) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f4] px-6">
        <div className="max-w-sm w-full bg-white rounded-[14px] border border-[#e5e0d8] p-8 text-center">
          <p className="text-[16px] font-semibold text-[#111] mb-2">링크를 열 수 없습니다</p>
          <p className="text-[13px] text-[#9a9080]">{error || '방송을 찾을 수 없습니다.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] px-4 py-8">
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-5 mb-4">
          <p className="text-[15px] font-bold text-[#111] mb-1">{live.title}</p>
          <p className="text-[12px] text-[#9a9080]">
            {live.scheduled_at ? formatDateTime(live.scheduled_at) : '시간 미정'}
          </p>
          <span
            className={`inline-block mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full ${
              broadcasting && streamState === 'connected'
                ? 'bg-[#E8F6EC] text-[#1E7B3C]'
                : 'bg-[#F3F1EC] text-[#9a9080]'
            }`}
          >
            {broadcasting && streamState === 'connected' ? '● 방송 중' : '방송 대기'}
          </span>
        </div>

        {!streamInfo ? (
          <button
            type="button"
            onClick={createChannel}
            disabled={provisioning}
            className="w-full text-[14px] font-semibold text-white bg-ink rounded-full py-3 disabled:opacity-60"
          >
            {provisioning ? '채널 준비 중…' : '방송 준비 시작'}
          </button>
        ) : (
          <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-4">
            <div className="relative w-full aspect-[9/16] max-h-[420px] bg-black rounded-[10px] overflow-hidden mb-4">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`w-full h-full object-cover ${flipped ? 'rotate-180' : ''}`}
              />
              {!camReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[13px] text-white/70">카메라 미리보기</p>
                </div>
              )}
              {camReady && (
                <button
                  type="button"
                  onClick={toggleFlip}
                  className={`absolute top-2 right-2 text-[11px] font-semibold px-3 py-1.5 rounded-full ${
                    flipped ? 'bg-ink text-white' : 'bg-black/50 text-white'
                  }`}
                >
                  {flipped ? '화면 뒤집기 ON' : '화면 뒤집기'}
                </button>
              )}
            </div>
            {camReady && (
              <p className="text-[11px] text-[#9a9080] text-center mb-3">
                폰을 거꾸로 거치했다면 위 "화면 뒤집기"를 눌러 시청자 화면을 바로잡으세요.
              </p>
            )}

            {!camReady ? (
              <button
                type="button"
                onClick={openCamera}
                className="w-full text-[14px] font-semibold text-white bg-[#111] rounded-full py-3"
              >
                카메라 켜기
              </button>
            ) : !broadcasting ? (
              <button
                type="button"
                onClick={startBroadcast}
                className="w-full text-[14px] font-semibold text-white bg-[#e94057] rounded-full py-3"
              >
                방송 시작
              </button>
            ) : (
              <button
                type="button"
                onClick={stopBroadcast}
                className="w-full text-[14px] font-semibold text-[#111] bg-[#F3F1EC] rounded-full py-3"
              >
                방송 종료
              </button>
            )}
            {broadcastErr && <p className="text-[12px] text-[#FF4757] mt-3">{broadcastErr}</p>}
          </div>
        )}

        <p className="text-[11px] text-[#9a9080] text-center mt-5 leading-relaxed">
          이 화면을 벗어나거나 새로고침하면 송출이 끊깁니다.
          <br />방송 중에는 화면을 계속 켜둔 채로 진행해 주세요.
        </p>
      </div>
    </div>
  )
}
