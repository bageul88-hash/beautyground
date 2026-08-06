import { useEffect, useState } from 'react'
import { useProductQuestions } from '../../hooks/useProductQuestions'
import { useIsAdmin } from '../../lib/useIsAdmin'
import { supabase } from '../../lib/supabase'

function maskName(name: string) {
  const base = name.includes('@') ? name.split('@')[0] : name
  if (base.length <= 1) return base
  if (base.length <= 2) return base[0] + '*'
  return base.slice(0, 2) + '*'.repeat(base.length - 2)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 상품 상세 구매 문의(Q&A) — 비밀글은 작성자 본인·관리자만 내용 확인, 답변은 관리자만 등록.
export default function ProductQnA({ productId, className = '' }: { productId: string; className?: string }) {
  const { questions, loading, myUserId, ask, answer, remove } = useProductQuestions(productId)
  const { isAdmin } = useIsAdmin()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [draft, setDraft] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [answerTargetId, setAnswerTargetId] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
  }, [])

  const submit = async () => {
    if (!draft.trim()) return
    setSubmitting(true)
    setError('')
    const { error: err } = await ask(draft.trim(), isSecret)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setDraft('')
    setIsSecret(false)
  }

  const submitAnswer = async (id: string) => {
    if (!answerDraft.trim()) return
    const { error: err } = await answer(id, answerDraft.trim())
    if (!err) {
      setAnswerTargetId(null)
      setAnswerDraft('')
    }
  }

  return (
    <section className={`px-4 py-8 ${className}`}>
      <div className="max-w-[1000px] mx-auto">
        <h2 className="text-[13px] font-bold tracking-[0.08em] text-ink mb-4">
          상품 문의 ({questions.length.toLocaleString('ko-KR')})
        </h2>

        {loggedIn === false ? (
          <p className="text-[13px] text-ink-soft bg-quiet px-4 py-3">
            <a href="/app/login" className="underline font-bold text-ink">로그인</a> 후 문의를 남길 수 있습니다.
          </p>
        ) : (
          <div className="border border-rule p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="상품에 대해 궁금한 점을 남겨주세요"
              rows={3}
              className="w-full text-[13px] text-ink placeholder:text-ink-faint resize-none focus:outline-none"
            />
            {error && <p className="text-[12px] text-signal-red mt-1">{error}</p>}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} />
                비밀글로 문의
              </label>
              <button
                onClick={() => void submit()}
                disabled={submitting || !draft.trim()}
                className="text-[13px] font-bold text-paper bg-ink px-4 py-2 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
              >
                {submitting ? '등록 중…' : '문의 등록'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 divide-y divide-rule border-t border-rule">
          {loading ? (
            <p className="py-8 text-center text-[13px] text-ink-faint">불러오는 중…</p>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-faint">아직 등록된 문의가 없습니다.</p>
          ) : (
            questions.map((q) => {
              const isOwner = myUserId === q.user_id
              const hidden = q.is_secret && !isOwner && !isAdmin
              return (
                <div key={q.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
                        <span className="font-bold text-ink">Q</span>
                        <span>{maskName(q.author_name)}</span>
                        <span className="text-ink-faint">{formatDate(q.created_at)}</span>
                        {q.is_secret && <span className="text-ink-faint">🔒 비밀글</span>}
                      </div>
                      <p className="text-[13px] text-ink whitespace-pre-wrap break-words">
                        {hidden ? '비밀글입니다.' : q.question}
                      </p>
                    </div>
                    {(isOwner || isAdmin) && (
                      <button
                        onClick={() => void remove(q.id)}
                        className="shrink-0 text-[11px] text-ink-faint underline focus:outline-none focus-visible:shadow-ring"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {!hidden && q.answer && (
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-rule">
                      <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
                        <span className="font-bold text-signal-blue">A</span>
                        <span className="text-ink-faint">{formatDate(q.answered_at ?? q.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{q.answer}</p>
                    </div>
                  )}

                  {!hidden && !q.answer && isAdmin && (
                    <div className="mt-2 ml-4">
                      {answerTargetId === q.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={answerDraft}
                            onChange={(e) => setAnswerDraft(e.target.value)}
                            rows={2}
                            placeholder="답변을 입력하세요"
                            className="w-full text-[13px] border border-rule px-2 py-1.5 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void submitAnswer(q.id)}
                              className="text-[12px] font-bold text-paper bg-ink px-3 py-1.5 focus:outline-none focus-visible:shadow-ring"
                            >
                              등록
                            </button>
                            <button
                              onClick={() => { setAnswerTargetId(null); setAnswerDraft('') }}
                              className="text-[12px] text-ink-soft px-3 py-1.5 focus:outline-none focus-visible:shadow-ring"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAnswerTargetId(q.id); setAnswerDraft('') }}
                          className="text-[12px] font-bold text-signal-blue underline focus:outline-none focus-visible:shadow-ring"
                        >
                          답변 등록
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
