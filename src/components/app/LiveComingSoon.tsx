import BottomNav from '../layout/BottomNav'

// 라이브커머스 준비중 안내 — 일반 고객에게 노출(관리자만 실제 라이브 화면을 봄).
export default function LiveComingSoon() {
  return (
    <div className="min-h-screen bg-cream-2 md:py-6">
      <div className="max-w-[480px] mx-auto bg-cream-4 min-h-screen md:min-h-0 md:rounded-lg md:overflow-hidden md:shadow-[0_12px_28px_-16px_rgba(23,19,16,.35)] pb-24">
        <div className="flex flex-col items-center justify-center text-center px-8 py-32">
          <div className="w-20 h-20 rounded-full bg-gold/15 flex items-center justify-center text-4xl mb-6" aria-hidden="true">
            📺
          </div>
          <h1 className="font-serif text-[22px] font-bold text-text mb-3">라이브커머스 준비 중이에요</h1>
          <p className="text-text-sub text-[14px] leading-relaxed">
            더 좋은 라이브 방송으로 곧 찾아뵐게요.
            <br />
            지금은 쇼핑을 먼저 즐겨보세요!
          </p>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
