---
name: 뷰티그라운드
description: 백화점 매장에서 직접 고른 뷰티를 생방송으로 파는 편집샵 — 흰 바탕 위 방송 신호색
colors:
  paper: "#FFFFFF"
  ink: "#17181C"
  ink-soft: "#5B5E66"
  ink-faint: "#8E9199"
  rule: "#E3E5E9"
  surface-quiet: "#F4F5F7"
  signal-red: "#E60012"
  signal-blue: "#0047FF"
  signal-yellow: "#FFD400"
typography:
  display:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "clamp(1.75rem, 6vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0"
  label:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  numeric:
    fontFamily: "'맑은 고딕', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
rounded:
  field: "0px"
  control: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "16px 24px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper}"
  button-live:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "16px 24px"
    typography: "{typography.title}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "14px 20px"
    typography: "{typography.title}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    padding: "7px 13px"
    typography: "{typography.label}"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  slate-live:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 14px"
    typography: "{typography.body}"
---

<!-- SEED: 골드 팔레트를 폐기하고 새 비주얼 월드를 확정한 기록. 색·타입·형태 규칙은 대표님 지시와 방향 결정으로 확정됐고, 컴포넌트 실측 토큰은 첫 구현이 끝난 뒤 /impeccable document 재실행으로 갱신할 것. -->

# Design System: 뷰티그라운드

## Overview

**Creative North Star: "생방송 슬레이트"**

우리 고객은 라이브를 보다 들어옵니다. 매장을 모르고, 브랜드를 처음 보고, 속으로 "이거 믿을 만한가"를 묻습니다. 그래서 이 시스템은 백화점 카탈로그가 아니라 **방송 그래픽의 문법**을 씁니다. 지금 무엇이 방송 중인지, 얼마인지, 몇 개 남았는지, 언제 끝나는지 — 방송이 화면에 얹는 정보와 커머스가 말해야 하는 정보는 정확히 같습니다. 고객이 방금 전까지 보던 언어를 그대로 이어서 쓰는 것이 이 시스템의 목적입니다.

바탕은 흰색입니다. 색은 배경을 물들이는 분위기가 아니라, **면(面)으로 들어오는 신호**입니다. 방송 자막바가 그렇듯 색은 한 덩어리로 들어와 한 가지 사실을 말하고 빠집니다. 빨강은 지금 벌어지는 일, 파랑은 확정된 정보, 노랑은 조건이 붙은 혜택입니다. 이 셋 말고는 색이 없습니다. 상품 사진이 화면에서 가장 화려한 요소여야 하고, 인터페이스는 그 뒤로 물러납니다.

밀도는 낮지 않습니다. 커머스는 숫자를 정확히 읽히게 해야 하는 화면이고, 방송 그래픽은 원래 정보 밀도가 높습니다. 다만 그 밀도는 장식이 아니라 **정렬**로 감당합니다. 숫자는 폭이 고정되어 세로로 줄이 맞고, 면과 면은 1px 선으로 나뉘며, 그림자는 쓰지 않습니다.

**Key Characteristics:**
- 흰 바탕 위에 순수 원색 3개, 그 외의 색은 없음
- 색은 점·테두리·그라데이션이 아니라 꽉 찬 면으로만
- 모든 수치는 폭 고정(tabular) 정렬
- 그림자 없음 — 깊이는 1px 선과 색면으로만
- 골드·금박·크림·베이지 전면 폐기

## Colors

흰 종이 위에 방송 신호를 얹은 팔레트. 중간톤 없이 흑·백·원색으로 끊어 갑니다.

### Primary
- **시그널 레드** (#E60012): **지금 일어나는 일**에만. 온에어 표시, 방송 중 슬레이트, 마감 임박 카운트다운, 품절 임박. 화면에서 이 색이 보이면 시간이 걸린 사안이라는 뜻이어야 합니다.

### Secondary
- **시그널 블루** (#0047FF): **확정된 정보와 행동**. 가격 확정 표시, 배송/주문 상태, 링크, 기본 버튼의 활성·호버 상태, 포커스 링. 신뢰를 담당하는 색이라 절대 세일 강조에 쓰지 않습니다.

### Tertiary
- **시그널 옐로** (#FFD400): **조건이 붙은 혜택**. 라이브 쿠폰, 수량 한정, 무료배송 도달선. 반드시 잉크색 글자와 함께 쓰고, 면적은 화면당 한 곳으로 제한합니다.

### Neutral
- **페이퍼** (#FFFFFF): 모든 화면의 바탕. 예외 없음.
- **잉크** (#17181C): 본문과 제목, 기본 버튼의 바탕. 순수 검정이 아니라 아주 살짝 푸른 기가 도는 먹색이라 흰 바탕에서 눈이 덜 아픕니다.
- **잉크 소프트** (#5B5E66): 보조 설명, 브랜드명, 비활성 탭.
- **잉크 페인트** (#8E9199): 캡션, 단위, 플레이스홀더. 본문에는 쓰지 않습니다.
- **룰** (#E3E5E9): 면을 나누는 1px 선. 이 시스템에서 구획은 전부 이 선이 담당합니다.
- **콰이엇 서피스** (#F4F5F7): 입력 영역·비활성 블록처럼 눌린 느낌이 필요한 곳에만.

### Named Rules

**The 신호 규칙.** 원색 3개는 사실을 말할 때만 켜집니다. 빨강=지금, 파랑=확정, 노랑=조건. 예뻐서 칠하는 원색은 이 시스템에 없습니다. 어떤 색면을 놓기 전에 "이게 무슨 사실을 말하는가"에 한 문장으로 답하지 못하면 그 색은 빼야 합니다.

**The 흰 바탕 규칙.** 배경은 항상 흰색입니다. 색은 바·슬레이트·버튼 같은 면으로만 들어오고 페이지 배경이 되지 않습니다. 다크 배경, 색 배경, 그라데이션 배경 모두 금지입니다.

**The 한 화면 두 색 규칙.** 한 화면에서 원색은 최대 두 개까지만 동시에 보입니다. 셋이 함께 보이면 어느 것도 신호로 읽히지 않습니다.

## Typography

**Display Font:** 맑은 고딕 (Malgun Gothic, Apple SD Gothic Neo 대체)
**Body Font:** 맑은 고딕 (동일)
**Label/Numeric Font:** 맑은 고딕 + `font-variant-numeric: tabular-nums`

**Character:** 한 벌의 서체로만 갑니다. 라이선스 문제를 피하기 위한 확정 지시이며, 이 시스템은 그 제약을 약점이 아니라 규율로 씁니다. 서체가 하나뿐이라 위계는 오로지 **굵기 대비(400 대 700)와 크기 점프**로 만듭니다. 맑은 고딕은 중간 굵기가 없으므로, 어중간한 강조를 시도하지 말고 본문 400과 강조 700 두 단계로만 끊습니다.

### Hierarchy
- **Display** (700, clamp 1.75–2.5rem, 1.15, 자간 -0.03em): 화면 최상단 한 곳. 슬레이트 제목·섹션 선언.
- **Headline** (700, 1.25rem, 1.3, 자간 -0.02em): 상품명, 방송 제목.
- **Title** (700, 1rem, 1.4): 버튼 글자, 카드 제목, 리스트 항목명.
- **Body** (400, 0.9375rem, 1.65): 설명문. 한 줄 최대 40자 내외.
- **Label** (700, 0.75rem, 자간 0.08em, 대문자/짧은 한글): 상태 배지, 표 머리, 카테고리 태그.
- **Numeric** (700, 1.375rem, 자간 -0.02em, tabular): 가격·수량·시간 전용.

### Named Rules

**The 숫자 정렬 규칙.** 가격·수량·남은 시간·재고는 전부 폭 고정 숫자(`font-variant-numeric: tabular-nums`)로 조판하고 오른쪽 정렬합니다. 목록에서 상품이 바뀌어도 숫자의 자릿수 위치가 흔들리면 안 됩니다. 맑은 고딕이 tabular를 지원하지 않는 환경이 확인되면 숫자만 시스템 등폭 서체로 대체하고, 그 사실을 이 문서에 기록합니다.

**The 두 굵기 규칙.** 굵기는 400과 700 두 가지뿐입니다. 500·600을 쓰거나, 굵기 대신 색을 흐리게 해서 위계를 만들지 않습니다.

## Layout

쇼핑 화면은 데스크톱에서도 **480px 폭 모바일 프레임**을 화면 가운데 두는 구조를 유지합니다(제품 확정 제약). 따라서 이 시스템은 처음부터 좁은 폭을 기준으로 설계되며, 넓은 화면용 다단 레이아웃을 전제하지 않습니다.

간격은 4px 배수 한 벌(4/8/16/24/40)로만 씁니다. 좌우 안전 여백은 16px로 고정하고, 색면(슬레이트·자막바·풀블리드 이미지)은 이 여백을 무시하고 화면 끝까지 나갑니다 — 그 대비가 이 시스템의 리듬입니다.

세로 리듬은 블록 사이 24px, 큰 구획 사이 40px. 제목 위 공간은 아래 공간보다 항상 넓게 둡니다. 스크롤은 밀도를 번갈아 배치해 호흡을 만듭니다: 꽉 찬 색면 다음에는 반드시 흰 여백 구간이 옵니다.

하단에는 탭 내비게이션이 고정되고, 상품 화면에서는 그 위에 구매 자막바가 겹쳐집니다. `env(safe-area-inset-bottom)`을 반드시 반영합니다.

## Elevation & Depth

**이 시스템에는 그림자가 없습니다.** 카드가 떠 보이게 만드는 방식 대신, 흰 바탕 위에서 1px 선(#E3E5E9)과 꽉 찬 색면으로 층을 만듭니다. 방송 그래픽은 화면 위에 얹히는 평면이지 입체가 아니며, 그림자는 이 문법에 존재하지 않습니다.

깊이가 필요한 유일한 경우는 **화면 위에 겹쳐지는 요소**(하단 자막바, 시트, 다이얼로그)입니다. 이때도 그림자가 아니라 상단 1px 선과 불투명 흰 배경으로 경계를 만듭니다.

### Named Rules

**The 무그림자 규칙.** `box-shadow`는 포커스 표시 외에는 쓰지 않습니다. 카드에 그림자를 넣고 싶으면 그건 구획이 약하다는 뜻이므로, 선을 쓰거나 여백을 넓히세요.

## Shapes

두 단계만 존재하며, 그 구분에는 의미가 있습니다.

- **면은 직각(0px)** — 슬레이트, 자막바, 상품 이미지, 색면 블록, 표. 방송 그래픽의 면은 화면 격자에 맞춰 잘리므로 모서리가 둥글지 않습니다.
- **조작 요소는 4px** — 버튼, 입력창, 칩, 토글. 손으로 누르는 것만 모서리가 살짝 깎입니다.

원형은 프로필 이미지와 온에어 점(dot)에만 허용합니다. 그 외에 알약형(pill) 버튼이나 20px 이상의 큰 라운드는 쓰지 않습니다 — 기존 골드 시스템의 부드러운 라운드(14~28px)는 이 월드에서 폐기됩니다.

테두리는 1px 실선 하나뿐입니다. 점선·이중선·굵은 테두리는 쓰지 않습니다.

## Components

### Buttons
- **Shape:** 거의 직각(4px), 높이 52px, 폭은 컨테이너 가득.
- **Primary:** 잉크 바탕(#17181C)에 흰 글자. 일반적인 확정 행동(구매·저장·다음).
- **Live:** 시그널 레드 바탕(#E60012)에 흰 글자. 방송 중 구매처럼 시간이 걸린 행동에만.
- **Hover / Focus:** 호버 시 바탕이 시그널 블루(#0047FF)로 전환(0.15s). 포커스는 2px 블루 아웃라인을 2px 바깥에 그립니다.
- **Ghost:** 흰 바탕 + 1px 룰 테두리 + 잉크 글자. 보조 행동.
- **Disabled:** 콰이엇 서피스 바탕 + 잉크 페인트 글자, 테두리 없음.

### Chips
- **Style:** 흰 바탕, 1px 룰 테두리, 잉크 소프트 글자, 라벨 타입(700/0.75rem/자간 0.08em).
- **State:** 선택 시 잉크 바탕에 흰 글자로 반전. 색 원색은 칩에 쓰지 않습니다.

### Cards / Containers
- **Corner Style:** 직각(0px). 이미지도 직각.
- **Background:** 흰색. 카드에 별도 배경색을 주지 않습니다.
- **Shadow Strategy:** 없음(Elevation & Depth 참조).
- **Border:** 항목 사이 1px 룰 구분선. 카드를 사방으로 둘러싸는 테두리는 목록에서 쓰지 않습니다.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** 흰 바탕, 1px 룰 테두리, 4px 라운드, 높이 48px.
- **Focus:** 테두리가 시그널 블루로 바뀌고 2px 블루 링이 붙습니다. `outline: none`만 주고 끝내지 않습니다.
- **Error:** 테두리와 안내문이 시그널 레드. 안내문은 무엇이 잘못됐고 어떻게 고치는지 적습니다.

### Navigation
- **하단 탭:** 흰 바탕, 상단 1px 룰. 선택된 탭만 잉크 700, 나머지는 잉크 페인트 400. 선택 표시에 원색을 쓰지 않습니다(신호색을 상태 표시로 소모하지 않기 위해).
- **상단 바:** 흰 바탕, 하단 1px 룰, 제목은 타이틀 타입. 스크롤해도 배경이 투명해지거나 흐려지지 않습니다.

### 온에어 슬레이트 (signature)
방송 상태를 알리는 이 시스템의 서명 요소. 화면 좌우 여백을 무시하고 폭을 가득 채우는 색면입니다.
- **방송 중:** 시그널 레드 바탕, 흰 라벨, 왼쪽에 지름 8px 흰 점. 점은 1.6초 주기로 불투명도만 변합니다(크기·위치 변화 없음).
- **편성 예정:** 흰 바탕 + 상하 1px 룰, 잉크 글자, 시각은 tabular 숫자.
- **종료(다시보기):** 콰이엇 서피스 바탕, 잉크 소프트 글자.
- 슬레이트 안에서는 글자를 두 줄 이상 쓰지 않습니다.

### 구매 자막바 (signature)
상품·방송 화면 하단에 겹쳐지는 고정 바. 방송 자막바의 형태를 그대로 씁니다.
- 흰 바탕, 상단 1px 룰, 좌측에 가격(numeric 타입, tabular), 우측에 버튼.
- 가격 옆 취소선 정가는 잉크 페인트, 할인율은 시그널 레드 라벨.
- 방송 중일 때만 버튼이 Live 변형(레드)으로 바뀝니다.

## Do's and Don'ts

### Do:
- **Do** 배경은 항상 흰색(#FFFFFF)으로 둔다.
- **Do** 원색은 사실을 말하는 면으로만 쓴다 — 빨강=지금 벌어지는 일, 파랑=확정된 정보와 행동, 노랑=조건부 혜택.
- **Do** 가격·수량·시간은 `font-variant-numeric: tabular-nums`로 조판하고 오른쪽 정렬한다.
- **Do** 구획은 1px 선(#E3E5E9)과 여백으로 만든다.
- **Do** 굵기는 400과 700 두 단계만 쓴다.
- **Do** 면(슬레이트·이미지·색면)은 직각 0px, 누르는 요소(버튼·입력·칩)는 4px으로 통일한다.
- **Do** 색면은 좌우 여백을 무시하고 화면 끝까지 채워 흰 여백과 대비를 만든다.
- **Do** 포커스 표시를 항상 남긴다(2px 시그널 블루 링).
- **Do** 움직임은 불투명도와 transform으로만, 0.15~0.25초 안에 끝낸다. `prefers-reduced-motion`에서는 전부 정지시킨다.

### Don't:
- **Don't** 골드·금박·황동·크림·베이지 계열을 쓰지 않는다. 이전 시스템의 #b8924a 계열 토큰은 폐기 대상이다.
- **Don't** 어두운 배경이나 색 배경 위에 페이지를 올리지 않는다.
- **Don't** 그라데이션을 쓰지 않는다(보라→파랑은 물론, 원색끼리의 그라데이션도 금지).
- **Don't** `box-shadow`로 카드를 띄우지 않는다.
- **Don't** 색 있는 배경 위에 회색 글자를 올리지 않는다.
- **Don't** 카드 안에 카드를 중첩하지 않는다.
- **Don't** 원색 3개를 한 화면에 동시에 노출하지 않는다(최대 2개).
- **Don't** 알약형(pill) 버튼이나 14px 이상의 큰 라운드를 쓰지 않는다.
- **Don't** 튕기는 바운스 이징을 쓰지 않는다.
- **Don't** 맑은 고딕 외의 서체를 도입하지 않는다(숫자 등폭 대체가 필요한 경우는 예외이며, 확인 후 이 문서에 기록한다).
- **Don't** 장식용 점·구분 도트·아이콘 타일로 여백을 메우지 않는다.
