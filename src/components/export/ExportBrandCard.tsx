import { Link } from 'react-router-dom'
import type { ExportBrandCardData } from '../../hooks/useExportBrandCards'

export interface ExportBrandCardLabels {
  viewAllProducts: string
  exportingToLabel: string
  moqLabel: string
}

// 해외 바이어용 브랜드 박스 — /export 피처드 섹션과 /export/brands 전체 목록이 공유.
// 팔레트 규칙: 화이트 면 + 헤어라인 외곽선 + 블랙 글씨(골드·그라데이션·이모지 금지).
export default function ExportBrandCard({ brand, labels }: { brand: ExportBrandCardData; labels: ExportBrandCardLabels }) {
  return (
    <div className="border border-rule rounded-card p-6">
      {/* 브랜드별 수출 미니페이지(/x/:key)로 연결 */}
      <Link to={`/x/${brand.id}`} className="flex items-center gap-3 mb-4 group w-fit">
        {brand.export_logo_url ? (
          <img
            src={brand.export_logo_url}
            alt={brand.brand_name}
            className="w-11 h-11 rounded-full object-cover border border-rule"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-quiet flex items-center justify-center text-[16px] font-bold text-ink-soft">
            {brand.brand_name.charAt(0)}
          </div>
        )}
        <p className="text-[16px] font-bold text-ink group-hover:underline">{brand.brand_name}</p>
      </Link>

      {brand.export_certifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {brand.export_certifications.map((cert) => (
            <span key={cert} className="px-2.5 py-1 rounded-pill text-[11px] border border-rule text-ink-soft">
              {cert}
            </span>
          ))}
        </div>
      )}

      {brand.export_pitch_en && (
        <p className="text-[13.5px] text-ink-soft leading-relaxed mb-3">{brand.export_pitch_en}</p>
      )}

      {brand.export_countries && (
        <p className="text-[12px] text-ink-faint mb-1">
          {labels.exportingToLabel}: <span className="text-ink-soft">{brand.export_countries}</span>
        </p>
      )}
      {brand.export_moq_notes && (
        <p className="text-[12px] text-ink-faint mb-4">
          {labels.moqLabel}: <span className="text-ink-soft">{brand.export_moq_notes}</span>
        </p>
      )}

      <Link
        to={`/x/${brand.id}`}
        className="inline-flex items-center gap-1 mt-2 text-[13px] font-semibold text-ink hover:underline"
      >
        {labels.viewAllProducts}
      </Link>
    </div>
  )
}
