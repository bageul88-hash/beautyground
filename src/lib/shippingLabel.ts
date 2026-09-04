// 송장(운송장) 출력 — 브라우저 인쇄로 라벨을 뽑는다 (2026-09-04)
// 뷰크라크몰에서 먼저 만든 것을 그대로 옮겼다 — 두 몰이 같은 규격을 쓰게 해서
// 한쪽을 고치면 다른 쪽도 같이 고칠 수 있게 한다.
//
// 왜 브라우저 인쇄인가:
//   택배사 API 가 붙으면 그쪽이 라벨 PDF 를 주므로 그걸 그대로 인쇄하면 된다(labelUrl).
//   하지만 계약 전까지는 라벨을 받을 데가 없다. 그동안에도 발송은 해야 하므로,
//   같은 내용을 담은 라벨을 우리가 그려서 인쇄한다. API 가 붙으면 labelUrl 이 있는 건만
//   그쪽 라벨로 바뀌고, 나머지는 이 형식을 그대로 쓴다.
//
// 크기: 100 x 150 mm — 택배 라벨 프린터(지브라·빅솔론 등)와 A4 둘 다에서 쓰는 표준 규격.

export interface LabelData {
  orderNo: string
  carrier: string
  trackingNo: string | null
  recipientName: string
  recipientPhone: string
  zip: string
  address: string
  memo?: string | null
  itemName: string
  quantity: number
  senderName: string
  senderPhone: string
  senderZip: string
  senderAddr: string
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

function labelHtml(d: LabelData): string {
  // 운송장 번호는 크게 — 창고에서 눈으로 대조하는 값이다
  const track = d.trackingNo
    ? `<div class="track">${esc(d.trackingNo)}</div>`
    : `<div class="track none">운송장 번호 미발급</div>`
  return `
  <div class="label">
    <div class="head">
      <span class="carrier">${esc(d.carrier)}</span>
      <span class="orderno">${esc(d.orderNo)}</span>
    </div>
    ${track}
    <div class="box">
      <div class="k">받는 분</div>
      <div class="v big">${esc(d.recipientName)} <span class="tel">${esc(d.recipientPhone)}</span></div>
      <div class="v addr">[${esc(d.zip)}] ${esc(d.address)}</div>
      ${d.memo ? `<div class="v memo">요청: ${esc(d.memo)}</div>` : ''}
    </div>
    <div class="box">
      <div class="k">보내는 분</div>
      <div class="v">${esc(d.senderName)} <span class="tel">${esc(d.senderPhone)}</span></div>
      <div class="v addr">[${esc(d.senderZip)}] ${esc(d.senderAddr)}</div>
    </div>
    <div class="box item">
      <div class="k">품목</div>
      <div class="v">${esc(d.itemName)} <b>${d.quantity}개</b></div>
    </div>
    <div class="foot">선불 · 뷰티그라운드</div>
  </div>`
}

const STYLE = `
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Malgun Gothic", "맑은 고딕", sans-serif; color: #000; background: #fff; }
  .label {
    width: 100mm; height: 150mm; padding: 5mm; page-break-after: always;
    border: 0.4mm solid #000; display: flex; flex-direction: column; gap: 2.5mm;
  }
  .head { display: flex; justify-content: space-between; align-items: baseline;
          border-bottom: 0.4mm solid #000; padding-bottom: 1.5mm; }
  .carrier { font-size: 4.2mm; font-weight: 700; }
  .orderno { font-size: 3mm; font-family: Consolas, monospace; }
  .track { font-size: 8mm; font-weight: 700; letter-spacing: 0.4mm; text-align: center;
           font-family: Consolas, monospace; padding: 1mm 0; }
  .track.none { font-size: 4mm; font-family: inherit; color: #666; border: 0.3mm dashed #999; }
  .box { border: 0.3mm solid #000; padding: 2mm; }
  .box.item { margin-top: auto; }
  .k { font-size: 2.8mm; color: #444; margin-bottom: 1mm; }
  .v { font-size: 3.4mm; line-height: 1.45; }
  .v.big { font-size: 5mm; font-weight: 700; }
  .v.addr { font-size: 3.6mm; font-weight: 500; }
  .v.memo { font-size: 3mm; color: #333; margin-top: 1mm; }
  .tel { font-family: Consolas, monospace; font-weight: 400; font-size: 3.6mm; }
  .foot { text-align: center; font-size: 2.8mm; color: #555; }
  @media screen {
    body { background: #eee; padding: 8mm; }
    .label { background: #fff; margin: 0 auto 8mm; box-shadow: 0 2px 12px rgba(0,0,0,.2); }
  }
`

/**
 * 새 창을 열어 라벨을 인쇄한다. 여러 건을 한 번에 넘기면 한 장씩 이어서 나온다.
 * 창을 띄우는 것이라 팝업 차단에 걸릴 수 있어, 실패하면 false 를 돌려준다.
 */
export function printLabels(rows: LabelData[]): boolean {
  if (!rows.length) return false
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return false
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>송장 ${rows.length}건</title>` +
    `<style>${STYLE}</style></head><body>${rows.map(labelHtml).join('')}</body></html>`
  )
  w.document.close()
  // 폰트가 잡힌 뒤 인쇄해야 글자가 깨지지 않는다
  w.onload = () => { w.focus(); w.print() }
  return true
}
