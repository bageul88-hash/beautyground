// 다음(카카오) 우편번호 서비스 — 동/구/시 자동완성 주소 검색 팝업
// https://postcode.map.daum.net/guide

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void
        width?: string | number
        height?: string | number
      }) => { open: () => void; embed: (el: HTMLElement) => void }
    }
  }
}

interface DaumPostcodeData {
  zonecode: string
  address: string
  roadAddress: string
  jibunAddress: string
}

export interface AddressSearchResult {
  zonecode: string
  address: string
}

let scriptPromise: Promise<void> | null = null

function loadDaumPostcodeScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('주소 검색을 불러오지 못했습니다'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// 팝업으로 주소 검색 후 "[13584] 서울 강남구 테헤란로 123" 형태로 반환
// ⚠️ 모바일 사파리에서 스크립트 로딩(await)을 거치고 나면 window.open이 사용자 제스처 밖으로
// 밀려나 팝업이 조용히 차단된다(눌러도 아무 반응 없음, 2026-08-27 실제 방송 중 발견) —
// 새로 만드는 화면은 팝업 없이 페이지에 바로 끼워넣는 embedAddressSearch를 쓸 것.
export async function searchAddress(): Promise<AddressSearchResult> {
  await loadDaumPostcodeScript()
  return new Promise((resolve) => {
    new window.daum!.Postcode({
      oncomplete: (data) => {
        const roadOrJibun = data.roadAddress || data.jibunAddress
        resolve({ zonecode: data.zonecode, address: `[${data.zonecode}] ${roadOrJibun}` })
      },
    }).open()
  })
}

// 팝업 대신 지정한 컨테이너 안에 검색 UI를 직접 그려 넣음(iframe) — 팝업 차단 문제 자체가 없다.
export function embedAddressSearch(container: HTMLElement, onComplete: (result: AddressSearchResult) => void): Promise<void> {
  return loadDaumPostcodeScript().then(() => {
    new window.daum!.Postcode({
      oncomplete: (data) => {
        const roadOrJibun = data.roadAddress || data.jibunAddress
        onComplete({ zonecode: data.zonecode, address: `[${data.zonecode}] ${roadOrJibun}` })
      },
      width: '100%',
      height: '100%',
    }).embed(container)
  })
}
