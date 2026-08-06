import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ProductQuestion {
  id: string
  product_id: string
  user_id: string
  author_name: string
  question: string
  is_secret: boolean
  answer: string | null
  answered_at: string | null
  created_at: string
}

export function useProductQuestions(productId: string | undefined) {
  const [questions, setQuestions] = useState<ProductQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    const [{ data: userData }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('product_questions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false }),
    ])
    setMyUserId(userData.user?.id ?? null)
    setQuestions((data ?? []) as ProductQuestion[])
    setLoading(false)
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  const ask = async (question: string, isSecret: boolean) => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user || !productId) return { error: '로그인이 필요합니다.' }
    const authorName = (user.user_metadata as { name?: string } | undefined)?.name || user.email || '구매자'
    const { error } = await supabase.from('product_questions').insert({
      product_id: productId,
      user_id: user.id,
      author_name: authorName,
      question,
      is_secret: isSecret,
    })
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  const answer = async (id: string, answerText: string) => {
    const { error } = await supabase
      .from('product_questions')
      .update({ answer: answerText, answered_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('product_questions').delete().eq('id', id)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  return { questions, loading, myUserId, ask, answer, remove, reload: load }
}
