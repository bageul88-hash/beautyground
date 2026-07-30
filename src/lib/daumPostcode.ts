// 다음(카카오) 우편번호 서비스 — 동/구/시 자동완성 주소 검색 팝업
// https://postcode.map.daum.net/guide

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void }
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
