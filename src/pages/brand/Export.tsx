import { useEffect, useState } from 'react'
import { getMyPartner, updateMyExportPitch } from '../../lib/partner'
import type { Partner } from '../../lib/types'

export default function BrandExport() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [pitch, setPitch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getMyPartner().then((p) => {
      if (!active) return
      setPartner(p)
      setPitch(p?.export_pitch ?? '')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await updateMyExportPitch(pitch.trim())
      setPartner(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[14px] text-[#9a9080]">불러오는 중...</p>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-[14px] border border-[#e5e0d8] p-10 text-center">
        <p className="text-[16px] font-semibold text-[#111] mb-2">브랜드 계정을 찾을 수 없습니다</p>
        <p className="text-[14px] text-[#9a9080]">뷰티그라운드 담당자에게 문의해 주세요.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6 mb-6">
        <h1 className="text-[16px] font-bold text-[#111] mb-2">수출 소개 작성</h1>
        <p className="text-[13px] text-[#9a9080] leading-relaxed">
          뷰티그라운드가 해외 바이어에게 {partner.brand_name} 브랜드를 제안할 때 사용할 소개글입니다.
          브랜드 스토리, 주요 제품, 강점 등을 자유롭게 작성해 주세요. 영어로 작성하시면 그대로 사용하기
          편하지만, 한글로 쓰셔도 저희가 정리해서 활용합니다. 이 내용은 뷰티그라운드 담당자만 확인하며,
          외부에 자동 공개되지 않습니다.
        </p>
      </div>

      <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-6">
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          rows={10}
          placeholder="예: [브랜드명]은 20XX년 설립된 [카테고리] 브랜드로, [핵심 성분/기술]을 담은 [대표 제품]으로 국내에서 [실적]을 쌓아왔습니다..."
          className="w-full px-4 py-3 border border-[#e5e0d8] rounded-[10px] text-[14px] text-[#111] placeholder:text-[#c4bcae] focus:outline-none focus:border-[#b8924a] transition-colors resize-none"
        />

        {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-[#0e0c08] text-white rounded-[10px] px-6 py-3 text-[14px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          {saved && <span className="text-[13px] text-[#b8924a] font-medium">저장되었습니다</span>}
        </div>
      </div>
    </>
  )
}
