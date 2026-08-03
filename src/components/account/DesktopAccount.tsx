import { Link } from 'react-router-dom'

const field =
  'w-full rounded-control bg-paper border border-rule px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

interface Props {
  email: string
  hasPasswordAuth: boolean
  name: string
  onName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  profileMsg: string
  savingProfile: boolean
  onSaveProfile: () => void
  newPassword: string
  onNewPassword: (v: string) => void
  newPasswordConfirm: string
  onNewPasswordConfirm: (v: string) => void
  pwMsg: string
  savingPw: boolean
  onChangePassword: () => void
  showDeleteConfirm: boolean
  onShowDeleteConfirm: (v: boolean) => void
  deleteMsg: string
  deleting: boolean
  onWithdraw: () => void
}

// PC 버전 — 설정류 페이지는 넓게 펼치지 않고 읽기 좋은 폭(560px)으로 중앙 정렬.
export default function DesktopAccount({
  email,
  hasPasswordAuth,
  name,
  onName,
  phone,
  onPhone,
  profileMsg,
  savingProfile,
  onSaveProfile,
  newPassword,
  onNewPassword,
  newPasswordConfirm,
  onNewPasswordConfirm,
  pwMsg,
  savingPw,
  onChangePassword,
  showDeleteConfirm,
  onShowDeleteConfirm,
  deleteMsg,
  deleting,
  onWithdraw,
}: Props) {
  return (
    <div className="bg-paper min-h-screen">
      <header className="bg-paper border-b border-rule sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
          <Link to="/app/home" className="text-[19px] font-bold text-ink tracking-[-0.01em]">
            뷰티그라운드
          </Link>
          <h1 className="ml-6 text-[15px] font-bold text-ink-soft">계정/보안</h1>
        </div>
      </header>

      <div className="max-w-[560px] mx-auto px-6 py-10 space-y-8">
        <section>
          <h2 className="text-[13px] font-bold text-ink-faint tracking-wide mb-3">회원정보</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-[13px] font-bold text-ink mb-1.5">이메일</label>
              <input id="email" value={email} disabled className={`${field} bg-quiet text-ink-faint`} />
            </div>
            <div>
              <label htmlFor="name" className="block text-[13px] font-bold text-ink mb-1.5">이름</label>
              <input id="name" value={name} onChange={(e) => onName(e.target.value)} placeholder="이름" className={field} />
            </div>
            <div>
              <label htmlFor="phone" className="block text-[13px] font-bold text-ink mb-1.5">연락처</label>
              <input id="phone" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="010-0000-0000" className={field} />
            </div>
            {profileMsg && <p className="text-[13px] text-ink-soft">{profileMsg}</p>}
            <button
              onClick={onSaveProfile}
              disabled={savingProfile}
              className="w-full rounded-control bg-ink text-paper font-bold text-[14px] py-3 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring"
            >
              {savingProfile ? '저장 중…' : '저장'}
            </button>
          </div>
        </section>

        {hasPasswordAuth && (
          <section>
            <h2 className="text-[13px] font-bold text-ink-faint tracking-wide mb-3">비밀번호 변경</h2>
            <div className="space-y-3">
              <input
                type="password" value={newPassword} onChange={(e) => onNewPassword(e.target.value)}
                placeholder="새 비밀번호 (8자 이상, 영문+숫자)" className={field}
              />
              <input
                type="password" value={newPasswordConfirm} onChange={(e) => onNewPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 확인" className={field}
              />
              {pwMsg && <p className="text-[13px] text-ink-soft">{pwMsg}</p>}
              <button
                onClick={onChangePassword}
                disabled={savingPw}
                className="w-full rounded-control border border-ink text-ink font-bold text-[14px] py-3 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring"
              >
                {savingPw ? '변경 중…' : '비밀번호 변경'}
              </button>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[13px] font-bold text-ink-faint tracking-wide mb-3">회원탈퇴</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => onShowDeleteConfirm(true)}
              className="text-[13px] text-ink-faint underline focus:outline-none focus-visible:shadow-ring"
            >
              회원탈퇴 신청
            </button>
          ) : (
            <div className="border border-signal-red p-4 space-y-3">
              <p className="text-[13px] text-ink leading-relaxed">
                탈퇴 시 로그인 계정은 즉시 삭제됩니다. 단, 이용약관·개인정보처리방침에 따라
                구매·결제 기록은 법정 보관기간 동안 별도 보관됩니다. 계속하시겠어요?
              </p>
              {deleteMsg && <p className="text-[13px] text-signal-red">{deleteMsg}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => onShowDeleteConfirm(false)}
                  className="flex-1 rounded-control border border-rule text-ink text-[13px] font-bold py-2.5 focus:outline-none focus-visible:shadow-ring"
                >
                  취소
                </button>
                <button
                  onClick={onWithdraw}
                  disabled={deleting}
                  className="flex-1 rounded-control bg-signal-red text-paper text-[13px] font-bold py-2.5 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring"
                >
                  {deleting ? '처리 중…' : '탈퇴하기'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
