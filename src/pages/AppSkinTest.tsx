import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppFrame from '../components/layout/AppFrame'
import BackHeader from '../components/layout/BackHeader'

type Step = 'intro' | 'camera' | 'analyzing' | 'result'

export default function AppSkinTest() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('intro')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (step !== 'camera') return

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        if (!cancelled) setCameraError('카메라를 사용할 수 없어요. 브라우저 권한을 확인해주세요.')
      }
    })()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [step])

  useEffect(() => {
    if (step !== 'analyzing') return
    const timer = setTimeout(() => setStep('result'), 2400)
    return () => clearTimeout(timer)
  }, [step])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9))
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStep('analyzing')
  }

  const restart = () => {
    setCapturedImage(null)
    setCameraError(null)
    setStep('intro')
  }

  return (
    <AppFrame>
      <BackHeader title="피부 테스트" transparent={step === 'camera' || step === 'analyzing'} />

      {step === 'intro' && (
        <div>
          <div className="bg-signal-red text-paper px-4 py-3 flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]">
            <span className="w-2 h-2 rounded-pill bg-paper" />
            지금 참여 가능
          </div>

          <div className="px-4 pt-10 pb-8">
            <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.03em]">
              내 피부, 지금
              <br />
              확인해보세요
            </h1>
            <p className="mt-4 text-[15px] leading-[1.65] text-ink-soft max-w-[40ch]">
              카메라로 얼굴을 비추면 30초 안에 확인할 수 있어요. 촬영한
              사진은 분석 후 서버에 남기지 않아요.
            </p>
            <button
              onClick={() => { setCameraError(null); setStep('camera') }}
              className="mt-6 w-full h-[52px] rounded-control bg-ink text-paper font-bold text-[16px] transition-colors hover:bg-signal-blue focus:outline-none focus-visible:shadow-ring"
            >
              카메라로 테스트 시작하기
            </button>
          </div>
        </div>
      )}

      {step === 'camera' && (
        <div className="relative bg-ink" style={{ aspectRatio: '3 / 4' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!cameraError && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-8 top-[14%] bottom-[22%] border border-paper/50" />
              <div className="scan-line absolute inset-x-8 top-[14%] h-px bg-signal-blue" />
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-4">
              <p className="text-paper text-[14px] leading-[1.6]">{cameraError}</p>
              <button
                onClick={restart}
                className="px-6 py-3 rounded-control bg-paper text-ink font-bold text-[14px]"
              >
                뒤로
              </button>
            </div>
          )}

          {!cameraError && (
            <div className="absolute bottom-0 inset-x-0 px-4 pb-8 pt-16 flex flex-col items-center gap-3">
              <p className="text-paper text-[13px] font-bold">
                얼굴을 사각형 안에 맞춰주세요
              </p>
              <button
                onClick={capture}
                aria-label="촬영"
                className="w-[68px] h-[68px] rounded-pill bg-paper border-4 border-ink/20 focus:outline-none focus-visible:shadow-ring"
              />
            </div>
          )}

          <style>{`
            .scan-line {
              animation: skin-scan 2.2s ease-in-out infinite;
            }
            @keyframes skin-scan {
              0% { top: 14%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 78%; opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .scan-line { animation: none; top: 45%; opacity: 0.6; }
            }
          `}</style>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="relative bg-ink" style={{ aspectRatio: '3 / 4' }}>
          {capturedImage && (
            <img src={capturedImage} alt="" className="w-full h-full object-cover opacity-80" />
          )}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-8 top-[14%] bottom-[22%] border border-signal-blue" />
            <div className="analyzing-line absolute inset-x-8 top-[14%] h-px bg-signal-blue" />
          </div>
          <div className="absolute bottom-0 inset-x-0 px-4 pb-10 text-center">
            <p className="text-paper text-[15px] font-bold tabular-nums">
              피부 분석 중
            </p>
          </div>
          <style>{`
            .analyzing-line {
              animation: skin-scan-fast 1.1s linear infinite;
            }
            @keyframes skin-scan-fast {
              0% { top: 14%; }
              100% { top: 78%; }
            }
            @media (prefers-reduced-motion: reduce) {
              .analyzing-line { animation: none; top: 45%; }
            }
          `}</style>
        </div>
      )}

      {step === 'result' && (
        <div>
          {capturedImage && (
            <div className="relative" style={{ aspectRatio: '3 / 4' }}>
              <img src={capturedImage} alt="촬영한 얼굴" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-4 pt-6">
            <p className="text-[12px] font-bold tracking-[0.08em] text-ink-soft">
              예시 결과
            </p>
            <h2 className="mt-3 text-[24px] font-bold leading-[1.2] tracking-[-0.02em]">
              피부 나이 <span className="text-signal-blue tabular-nums">43세</span>
            </h2>
            <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">
              같은 또래 평균보다 수분이 높은 편이에요. 참고용 결과이며
              정확한 진단은 전문가 상담이 정확해요.
            </p>
          </div>

          <div className="mt-6 mx-4 bg-signal-yellow rounded-control px-4 py-4">
            <p className="text-[15px] font-bold text-ink">
              결과 상담 신청하기
              <span className="block mt-1 text-[12px] font-normal text-ink-soft">
                담당 어드바이저가 결과를 보고 직접 코멘트를 남겨드려요
              </span>
            </p>
          </div>

          <div className="px-4 pt-6 pb-8 flex flex-col gap-2">
            <button
              className="w-full h-[52px] rounded-control bg-ink text-paper font-bold text-[16px] transition-colors hover:bg-signal-blue focus:outline-none focus-visible:shadow-ring"
            >
              상담 신청하기
            </button>
            <button
              onClick={restart}
              className="w-full h-[48px] rounded-control border border-rule text-ink font-bold text-[14px] focus:outline-none focus-visible:shadow-ring"
            >
              다시 촬영하기
            </button>
            <button
              onClick={() => navigate('/app/home')}
              className="w-full py-3 text-center text-[13px] text-ink-faint"
            >
              홈으로
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </AppFrame>
  )
}
