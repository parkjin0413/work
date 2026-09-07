# Personal Ops Dashboard — 제품 정보 (Product Catalog) Design Spec

## 1. Overview

새 메뉴 **"제품 정보"**. 회사 제품(벽재 / 바닥재 / 천장재와 그 하위 제품 종류)의
사양·특징·인증·시공방법을 **한 가지 고정 양식**으로 정리해 두고, 나중에 디자인·
제품소개서 등을 만들 때 참고 자료로 쓰기 위한 메뉴다. 핵심 사용 시나리오는 두 가지:

1. 대시보드 `/products`에서 전 제품을 **일목요연하게** 열람 (SKU 단위 총괄표 +
   제품별 데이터시트).
2. 정리해 둔 제품 내용을 **쉽게 복사**하거나, **Claude / VSCode에서 원본 파일을
   직접 읽어** 바로 무언가를 만들 수 있는 구조.

`wall-catalog-sample/` 폴더(현재 repo 안에 커밋 안 된 채로 들어와 있는 프리뷰
킷)가 이 기능의 v0다. 이 스펙은 그것을 정식 기능으로 승격하면서 ① 저장 모델
확정 ② 3분류 스키마 일반화 ③ repo 이관 + 실제 라우트화 ④ 복사/연동 포맷 확장
⑤ 규모 대비 내비를 정의한다.

## 2. Goals

- `content/products/{wall,floor,ceiling}/{slug}/product.md` 를 **원본**으로 하는
  파일 기반 제품 데이터. 편집은 VSCode에서 하고 git 커밋 → Vercel 재배포.
- 어떤 제품이 등록되든 **필드 구성이 흔들리지 않는** 고정 스키마 (`SCHEMA.md`가
  단일 진실). 정보가 없는 항목은 섹션을 없애지 않고 "정보 없음"으로 표시.
- 3분류(벽재·바닥재·천장재) **공통 코어 속성 + 분류별 확장 속성**을 지금 설계.
  현재 데이터는 벽재 3종뿐이지만 바닥/천장을 나중에 추가할 때 스키마를 안
  건드리도록.
- `/products` (총괄표 + 분류 요약 + 검색) / `/products/[category]` (분류별 데이터
  시트 목록) / `/products/[category]/[slug]` (단일 제품, 딥링크 대상) 3단 라우트.
- 제품별 복사 버튼: 사람이 읽는 텍스트 / 마크다운 원문 / JSON / "Claude용" 블록.
- `/products/catalog.json` — 전 제품을 한 파일로 주는 고정 URL (외부 연동 훅).
- Sidebar에 정확히 하나의 새 항목 "제품 정보" 추가.
- 대시보드의 기존 디자인 토큰(bg/surface/border/foreground/muted/accent…),
  Noto Sans KR, lucide-react 를 그대로 사용. 한글 UI.

## 3. Non-Goals

- **웹 UI에서의 제품 추가·수정·삭제 없음.** 이 메뉴는 열람·복사 전용이다. 편집은
  에디터에서 파일을 고치고 커밋하는 것으로 한다. (근거: §8 Key Decisions)
- **Supabase 미사용.** 이 기능은 이 프로젝트에서 유일하게 Supabase에 저장하지
  않는 first-party 데이터가 된다.
- **사진(제품 이미지) 관리 후속.** v1은 텍스트 정리만. 스키마의 `images: []`는
  파일명만 담는 자리로 유지하고, 실제 이미지 저장 위치(public/ vs Supabase
  Storage vs 외부 버킷)는 텍스트 모델과 독립적으로 나중에 결정한다. 화면에서는
  이미지 자리에 파일명 자리표시자만 표시.
- 제품 데이터 변경 이력 UI 없음 — git 히스토리가 그 역할을 한다.
- 다국어, 가격/재고, 견적 기능 없음.

## 4. Storage Model — 파일 기반 (결정)

### 4.1 왜 파일 기반인가

| | 파일 기반 (채택) | Supabase + JSON 익스포트 | Supabase만 |
|---|---|---|---|
| Claude/VSCode 연동 | repo 열면 바로 읽음 | 익스포트본만, 동기화 필요 | 매번 수동 익스포트 |
| 웹 편집 | ✗ (커밋+배포) | ✓ | ✓ |
| 중첩 구조(types·attributes·인증·시공단계) | YAML로 자연스러움 | 테이블 5~6개 or JSONB | 동일 |
| 스펙 변경 이력 | git 히스토리 | 별도 구현 | 별도 구현 |
| 구축 작업량 | 최소 (v0가 이미 이 형태) | 큼 | 큼 |

사진을 뺀 순간 파일 기반의 유일한 실질 약점(용량·Vercel 크기 제한·서버리스가
업로드를 repo에 못 씀)이 사라진다. 텍스트 마크다운은 작고 git 친화적이며, 편집자가
본인 한 명이고 이미 매일 이 repo를 VSCode/Claude Code로 열고, 제품 자료는 "앉아서
정리해 넣는" 성격이라 커밋 워크플로 마찰이 수용 가능하다.

### 4.2 기존 패턴과의 의도적 차이

즐겨찾기·계정관리·업무관리는 전부 Supabase + 웹 편집이다. 제품 정보만 파일 기반인
이유: (a) 1차 목표가 "원본을 Claude/VSCode가 직접 읽는다", (b) 정적인 버전 관리
대상 참고 데이터, (c) 깊게 중첩된 스키마가 SQL이 아니라 YAML에 맞음. 이건
프로젝트 관례를 깨는 **의식적 결정**이며, 이 스펙에 명시해 둔다.

## 5. Content Location & 이관

`wall-catalog-sample/` 를 해체해 repo 본체로 옮긴다:

```
content/products/
  SCHEMA.md                              ← wall-catalog-sample 의 것을 3분류로 일반화
  wall/{slug}/product.md                 ← 기존 3개 이동 (내용은 §6 스키마에 맞춰 정리)
  wall/{slug}/images/                    ← 빈 폴더 유지 (.gitkeep, 파일명만 스키마에 존재)
  floor/                                 ← 폴더만 (.gitkeep, 데이터 없음)
  ceiling/                               ← 폴더만 (.gitkeep)

lib/products/
  productsStore.ts                       ← wall-catalog-sample/lib-example/products.ts 기반 로더
  categories.ts                          ← 폴더 slug ↔ 한글 매핑 단일 정의 (wall↔벽재 등)
  attributeSchema.ts                     ← 코어/분류별 속성 key·라벨·순서·값 포맷 단일 정의 (§7.3)
app/products/…                           ← preview.html 렌더 로직을 컴포넌트로
```

- `_generated/` 폴더는 만들지 않는다. catalog는 `/products/catalog.json` 라우트가
  로더에서 생성한다 (§7.2). Claude가 앱 없이 읽는 오프라인 경로는 `SCHEMA.md` +
  `product.md` 원본 그 자체이며, 파생 blob을 커밋해 동기화 문제를 만들지 않는다.
- 이관 후 `wall-catalog-sample/` 폴더와 `preview.html`, `catalog.sample.json` 은
  삭제. 새 의존성 `gray-matter` 를 `package.json` 에 추가.

## 6. Schema — 공통 코어 + 분류별 확장

`content/products/SCHEMA.md` 가 단일 진실. frontmatter(YAML) + 본문(markdown).
frontmatter는 **항상 아래 필드를 전부** 가진다 (없으면 `[]` / `""` / `null`,
필드 자체를 생략하지 않음).

### 6.1 공통 frontmatter (전 분류 동일)

```yaml
category: 벽재 | 바닥재 | 천장재
slug: 제품-슬러그
name: 제품명
product_type: 형태 분류 (예: HPL 방수 벽 패널)
status: active | discontinued
summary: 한두 줄 요약

features: []                 # 특징 상세 (불릿)
highlight_features: []        # {title, description} 카드용, 최대 6개 표시

material: ""
structure: ""
installation_summary: ""

colors: []                   # 색상/디자인 옵션
colors_note: ""

types: []                    # §6.2 — 절대 생략 안 함, 최소 1행

certifications: []           # {label, standard, value}
certifications_note: ""
certification_documents: []  # 보유 인증서 이름 목록

installation_methods: []     # {method_name, steps:[{step,title,description,image}]}
installation_note: ""

finishing_options: []        # {name, image} — 순서 없음

images: []                   # 파일명만 (사진 자료 후속)
data_note: ""                # "확인 필요" 메모 (선택)
```

### 6.2 `types[]` — 평평한(flat) 표

두께만 다르든, 패턴+두께로 갈리든 전부 배열의 행 하나. 패턴 그룹 없으면
`group: null`.

```yaml
types:
  - group: null | "원형타공"
    type_name: 10.2T
    thickness: 10.2mm
    size_wxhxt: 600 x 2400 x 10.2 mm
    weight: ""
    composition: Box 2ea / 포장면적 2.98 ㎡
    surface: ""
    note: ""
    attributes: { … }        # §6.3
```

### 6.3 성능 속성 (`types[].attributes`)

**값을 채우는 원칙 (v0에서 그대로 계승):**
1. 해당 제품 문서의 `features` / `certifications` 에 실제로 적힌 문장·인증명에서만
   값을 끌어온다. 다른 제품·예시를 보고 유추하지 않는다.
2. 언급 없는 항목은 `false` 가 아니라 **`null`** (명시적 없음 ≠ 몰라서 비움).
3. `fire` 는 **국내 불연/준불연 등급만**. 해외 기준(예: 유럽 EN13501-1 "D-s3,d0")은
   여기 넣지 않고 `certifications` 배열에만 원문 그대로 남긴다.
4. 인증번호에 대응하는 정확한 시험 규격을 교차 확인 못 하면 `standard` 는 빈
   문자열로 두고 `certifications_note` 에 사유를 남긴다.

**코어 속성 (전 분류 · 총괄표 고정 컬럼):**

| key | 라벨 | 값 |
|---|---|---|
| `fire` | 화재 | `null` / `"불연"` / `"준불연"` (국내 기준만) |
| `eco` | 환경표지 | `true` / `null` |
| `hyg` | 항균 | `true` / `null` |
| `voc` | 유해물질 | `true` / `null` |

**벽재 확장:**

| key | 라벨 | 값 |
|---|---|---|
| `wtp` | 방수·방습 | `true` / `null` |
| `aco` | 흡음·차음 | `true` / `null` |
| `imp` | 내충격 | `true` / `null` |

**바닥재 확장:**

| key | 라벨 | 값 |
|---|---|---|
| `abrasion` | 내마모등급 | `"AC3"` / `"AC4"` / `"AC5"` / `null` |
| `impact_sound` | 층간소음 | `"ΔLw 00dB"` / `true` / `null` |
| `heating` | 온돌 적합 | `true` / `null` |
| `castor` | 의자바퀴 적합 | `true` / `null` |
| `dim_stability` | 치수안정성 | `true` / `null` |
| `slip` | 미끄럼저항 | `"R10"` / `"R11"` / `true` / `null` |

**천장재 확장:**

| key | 라벨 | 값 |
|---|---|---|
| `nrc` | 흡음률(NRC) | `"0.75"` / `true` / `null` |
| `light_weight` | 경량성 | `true` / `null` |
| `sag` | 처짐저항 | `true` / `null` |
| `humidity` | 내습성 | `true` / `null` |

- 기존 벽재 3개 파일은 `fire/eco/aco/hyg/wtp/saf` 를 쓰고 있다. 이관 시
  `saf`(항상 `null`) 는 제거, 나머지는 위 그룹핑에 그대로 매핑 (`voc` 는 라미네이트
  타일이 "VOC A+" 근거 있으므로 `true`, 나머지 둘은 `null`).
- 바닥/천장 확장 목록은 **가안**이다. 첫 바닥/천장 제품을 등록할 때 실제 제품
  상세자료로 확정한다 (§10).

### 6.4 총괄표 렌더 규칙

- 카테고리별 그룹 (WALL / FLOOR / CEILING 섹션). 지금은 벽재만, 분류 추가 시 자동
  으로 그룹만 늘어난다.
- 컬럼 = `품목` + `규격(W×H×T)` + **코어 5개(화재·환경표지·항균·유해물질·방수방습,
  항상 표시)** + **그 분류의 확장 컬럼 중 값이 하나라도 있는 것**. 확장 컬럼 세트가
  분류마다 다르므로 `<thead>` 를 **카테고리 그룹마다** 다시 그린다 (전체 union +
  "—" 방식 아님). `usedAttrsForCategory()` 로 값이 전무한 확장 컬럼(내마모등급/
  온돌/의자바퀴/경량성 등)은 자동으로 숨긴다.
- `fire` 는 값 텍스트("준불연") 그대로, 나머지 boolean/문자열 속성은 값 있으면
  채운 점(dot)/텍스트, `null` 이면 빈 점.
- 범례: "채운 점 = 원문에 명시됨 / 빈 점 = 정보 없음(해당없음 확정 아님)",
  "화재는 국내 기준만 (해외 등급은 제품 상세 인증표 참고)".

### 6.5 데이터시트 섹션 순서 (모든 제품 동일)

1. 헤더: 제품명 + 코어+분류 성능 배지 + 요약 + 타입 칩 + 복사 버튼들
2. 기본 정보 (소재 / 구조 / 설치방식 요약)
3. 핵심 특징 (카드 6칸, 부족하면 빈 칸)
4. 특징 상세 (불릿)
5. 타입별 규격 표 (그룹/타입/두께/규격/중량/제품구성/표면/비고)
6. 색상 / 디자인 옵션
7. 인증 표 (항목/시험규격/결과) + 보유 인증서 칩 + `certifications_note`
8. 설치 방법 (순서 있는 STEP)
9. 마감 옵션
10. 이미지 자료 (파일명 자리표시자)
11. 제품 설명 (frontmatter 아래 markdown 본문)

빈 값은 섹션 제거 없이 "정보 없음" 블록으로 표시.

**본문(`body`) 처리**: markdown 파서(react-markdown 등)를 새로 들이지 않는다.
`body` 는 §8.1 "마크다운 원문" 복사에는 그대로 포함되고, 화면 11번 섹션에는
`white-space: pre-line` 로 **평문 그대로** 렌더한다 (제목·불릿 기호가 텍스트로
보이는 정도는 감수). 본문이 비면 섹션 생략.

## 7. Loader & Route

### 7.1 `lib/products/productsStore.ts`

`wall-catalog-sample/lib-example/products.ts` 를 기반으로 하되 이 프로젝트의
`lib/*Store.ts` 명명·구조에 맞춘다 (Supabase 아님, `fs` + `gray-matter`).

```ts
export type ProductAttributeValue = string | boolean | null;
export type ProductType = {
  group: string | null;
  type_name: string; thickness: string; size_wxhxt: string;
  weight: string; composition: string; surface: string; note: string;
  attributes: Record<string, ProductAttributeValue>;
};
export type Product = {
  category: "벽재" | "바닥재" | "천장재";
  slug: string; name: string; product_type: string;
  status: "active" | "discontinued";
  summary: string;
  features: string[];
  highlightFeatures: { title: string; description: string }[];
  material: string; structure: string; installationSummary: string;
  colors: string[]; colorsNote: string;
  types: ProductType[];
  certifications: { label: string; standard: string; value: string }[];
  certificationsNote: string; certificationDocuments: string[];
  installationMethods: { methodName: string; steps: { step: number; title: string; description: string; image: string }[] }[];
  installationNote: string;
  finishingOptions: { name: string; image: string }[];
  images: string[];
  dataNote: string;
  body: string;              // frontmatter 아래 markdown 본문
  dir: string;               // 이미지 상대경로 해석용, 예: content/products/wall/<slug>
};

export function getAllProducts(rootDir?: string): Product[];   // rootDir: 테스트 픽스처 주입용
export function getProductsByCategory(category: Product["category"]): Product[];
export function getProductBySlug(category: string, slug: string): Product | undefined;
export function getRawMarkdown(category: string, slug: string): string | undefined;  // §8.1 "마크다운 원문"
export function getCatalogRows(): {           // 총괄표용 flat 행
  category: Product["category"]; productName: string; slug: string;
  typeName: string; group: string | null; size: string;
  attributes: Record<string, ProductAttributeValue>;
}[];
export function getCatalog(): { generatedAt: string; products: Product[] };
```

- **누락 필드 백필**: frontmatter에 필드가 빠져 있어도 로더가 스키마 기본값
  (`[]` / `""` / `null`)으로 채워 반환한다 → 렌더러는 항상 완전한 객체를 받는다
  ("필드 항상 전부" 계약을 로더가 강제).
- `getAllProducts` 는 선택 `rootDir` 인자를 받아 테스트에서 픽스처 디렉터리를
  가리킬 수 있게 한다 (기본값 = `path.join(process.cwd(), "content/products")`).
- `category` 폴더명 ↔ 한글 매핑은 `lib/products/categories.ts` 한 곳에만 둔다
  (`wall`↔벽재, `floor`↔바닥재, `ceiling`↔천장재). 라우트·로더·렌더 모두 이걸 import.

### 7.2 라우트 — 전부 정적(SSG). `force-dynamic` 금지

제품 데이터는 재배포 시점에만 바뀌는 **빌드 타임 콘텐츠**다. Vercel 서버리스
함수는 런타임에 `process.cwd()` 기준 임의 파일 읽기를 번들에 자동 포함하지 않으므로
(`content/**` 가 lambda에서 누락될 수 있음), 아래 라우트는 **모두 정적 생성**한다.

| 경로 | 내용 | 렌더 |
|---|---|---|
| `/products` | 랜딩. 상단 검색/분류 필터(클라이언트) → **제품 규격 총괄표**(§6.4, 전 분류) + 분류별 요약 카드(제품 수·대표 타입). | SSG |
| `/products/[category]` | 분류 페이지 = **그 분류 전 제품의 항목별 N열 비교**(PC 3열). 총괄표 + `ProductComparison`: 데이터시트 섹션(성능·기본정보·핵심특징·특징상세·타입별규격·색상·인증·설치방법·마감·이미지·제품설명)을 **섹션마다 한 번** 그리고 그 아래 N제품 내용을 가로로 나열 → 섹션끼리 정렬돼 한 눈에 비교. **전 제품 전체 내용이 이 한 화면에 다 나오므로 개별 제품 페이지는 두지 않는다.** 열 머리에 제품별 복사 버튼 4종 + 앵커 `id={slug}`. `overflow-x-auto` 로 좁은 화면 가로 스크롤. | SSG + `generateStaticParams` (wall/floor/ceiling 3개) |
| ~~`/products/[category]/[slug]`~~ | **없음.** 개별 데이터시트와 비교 뷰가 같은 `datasheetSections.tsx` 를 공유해 고유 내용이 없어서 제거. 랜딩 검색 결과는 `/products/[category]#[slug]` 앵커로 연결. | — |
| `/products/print` | 인쇄용 전 제품 데이터시트. 사이드바 없는 흰 종이(A4 폭) 형태, 분류별 헤더 + 제품마다 세로 데이터시트(`PrintDatasheet`), 제품·분류마다 `break-before-page`. `PrintButton`(`window.print()`, `print:hidden`). 흑백·얇은 테두리. 랜딩/분류 페이지에 "인쇄용 보기" 링크. | SSG |
| `/products/catalog.json` (`route.ts`) | `getCatalog()` 를 `application/json` 으로. `export const dynamic = "force-static"`. | 정적 |

- 잘못된 `slug` → `notFound()`. **빈 분류**(floor/ceiling, 현재 제품 0개) → 404 아님,
  "등록된 제품이 없습니다." 빈 상태로 렌더.
- 전체 데이터시트 렌더는 leaf 라우트에서만 쓰는 `components/products/ProductDatasheet.tsx`.
  분류 페이지의 컴팩트 카드는 별도 `ProductCard.tsx`. 총괄표는 `RollupTable.tsx`.
  preview.html 의 렌더 함수들(`renderTypes`/`renderCertifications`/`renderInstallation`/
  `renderHighlights`/`renderRollup`)이 이 컴포넌트들의 출발점.
- 만약 어떤 이유로든 런타임 파일 읽기가 불가피해지면 `next.config` 의
  `outputFileTracingIncludes` 에 `content/products/**` 를 명시한다 (fallback, v1엔 불필요).

### 7.3 `lib/products/attributeSchema.ts`

preview.html 의 `ATTR_META` 를 3분류로 일반화한 단일 렌더 설정:

```ts
type AttrDef = { key: string; label: string; format: "flag" | "text" };
export const CORE_ATTRS: AttrDef[];                              // fire·eco·hyg·voc
export const CATEGORY_ATTRS: Record<Product["category"], AttrDef[]>;  // 분류별 확장
```

- 총괄표 컬럼 순서, 데이터시트 성능 배지 순서, "Claude용/텍스트 복사" 의 성능
  줄 순서가 전부 이 정의 하나를 따른다. 속성 key를 추가/변경할 땐 여기와
  `SCHEMA.md` 만 고치면 됨.
- `format: "text"` (fire, abrasion, impact_sound, slip, nrc) 는 값 문자열 그대로,
  `"flag"` 는 값 있으면 채운 표식 / `null` 이면 빈 표식.

## 8. 복사 / 연동 어피던스

### 8.1 제품별 (데이터시트 헤더의 버튼 그룹)

| 버튼 | 산출물 |
|---|---|
| **텍스트 복사** | 사람이 읽는 평문 블록 (preview.html `buildCopyText` 계승·확장: 분류별 확장 속성 포함) |
| **마크다운 원문** | 그 제품 `product.md` 의 원본 전체 (frontmatter + 본문) — Claude에 정확한 소스를 줌 |
| **JSON** | 파싱된 `Product` 객체 하나 |
| **Claude용** | 평문 블록 앞에 지시 한 줄 + 스키마 위치 안내<br>(예: `아래는 {회사} 제품 데이터입니다. 스키마는 content/products/SCHEMA.md 기준. …`) |

`{회사}` 표기 문자열은 §10 확인 필요.

### 8.2 전역 (`/products` 랜딩)

- **catalog.json 복사** — 전 제품 한 JSON (`getCatalog()` 결과, 랜딩에 서버에서
  주입된 값을 클립보드로).
- 고정 URL `/products/catalog.json` (§7.2) 안내 — 외부/에디터에서 이 URL 하나만
  가리키면 전 제품을 받음. (Vercel 배포 도메인 기준 절대경로도 함께 표시.)
- (후속) 제품별 raw `.md` 라우트 — 파일이 이미 repo 알려진 경로에 있으므로 v1 생략.

복사는 기존 계정관리 패턴(`navigator.clipboard.writeText` + 1.6초 "복사됨 ✓"
피드백, `execCommand` 폴백) 재사용.

## 9. catalog 아티팩트

- 커밋되는 파생 파일(`_generated/catalog.json` 등)은 만들지 않는다 — 원본
  `product.md` 와 동기화가 어긋날 여지를 없앤다.
- 앱 내 연동 경로: `/products/catalog.json` 정적 라우트 (§7.2).
- 앱 없는(오프라인) 연동 경로: `content/products/SCHEMA.md` + `product.md` 원본을
  Claude Code가 직접 읽음.
- 별도 export 스크립트·npm 스크립트·신선도 테스트 불필요.

## 10. Sidebar 통합

`components/layout/Sidebar.tsx` 의 `NAV_ITEMS` 에 정확히 한 항목 추가:

```ts
{ href: "/products", label: "제품 정보", icon: Package },
```

(`Package` from `lucide-react`.) 위치는 마지막(`업무관리` 뒤) — 참고 데이터라
일상 업무 메뉴들 다음. 기존 `pathname?.startsWith(href)` 활성 표시가
`/products/*` 를 그대로 커버하므로 다른 변경 없음.

## 11. 규모 대비 내비게이션

- `/products` 상단에 **검색 입력**(클라이언트 필터: 제품명 / product_type /
  material / 인증명 부분일치) + **분류 필터 칩**(전체 / 벽재 / 바닥재 / 천장재).
- 제품 3개일 땐 사실상 무의미하지만 "일목요연"이 규모에서도 유지되도록 처음부터
  넣는다. 계정관리의 필터 UI 패턴 참고, 단 여긴 로컬 데이터라 순수 클라이언트
  필터.
- `discontinued` 제품: 목록에 "단종" 배지로 표시(숨기지 않음), 총괄표에는 흐리게.

## 12. 스타일

- preview.html 의 자체 팔레트(clay/slate/paper/IBM Plex)는 **버린다**. 대시보드
  기존 시맨틱 토큰(`bg`/`surface`/`surface-hover`/`border`/`foreground`/`muted`/
  `accent`/`danger`/`success`), Noto Sans KR, lucide-react 로 재구성. 다크/라이트
  자동.
- `accent/10` 등 알파 수식어는 이 repo에서 이미 채널 트리플렛으로 처리돼 있어
  안전.
- 규격 숫자 표기는 Tailwind 기본 `font-mono` 스택 사용 — 새 폰트 추가 없음.
- 표는 `overflow-x-auto` 컨테이너로 감싸 좁은 화면에서 가로 스크롤.

## 13. Testing Strategy

- **`lib/products/productsStore.ts`** — 실제 커밋된 `content/products/` (벽재 3종,
  안정적) 대상으로: 알려진 제품 파싱 결과, `getProductsByCategory` 필터,
  `getCatalogRows()` flat 전개, `getCatalog()` 형태, `getRawMarkdown()` 원문 반환.
  **필드 누락 백필**은 `test/fixtures/products-minimal/` 에 최소 frontmatter 제품
  하나를 두고 `getAllProducts(fixtureRoot)` 로 검증 (모든 배열/문자열 필드가
  기본값으로 채워지는지).
- **`lib/products/attributeSchema.ts` / `categories.ts`** — 코어+분류별 key 집합,
  slug↔한글 왕복 매핑.
- **렌더 컴포넌트** — 빈 배열 제품 → 모든 섹션이 "정보 없음" 상태로 렌더 /
  꽉 찬 제품 → 모든 섹션 존재 (role 쿼리). `RollupTable`: 분류별 `<thead>` 컬럼
  세트가 분류마다 다르게 나오는지.
- **검색/필터 컴포넌트** — 입력 시 목록 축소, 분류 칩 토글.
- **`app/products/catalog.json/route.ts`** — 유효 JSON, 전 제품 포함,
  `content-type: application/json`.
- **`app/products/[category]/page.tsx`** — 제품 있는 분류(wall) 목록 렌더 /
  빈 분류(floor) "등록된 제품이 없습니다." / 잘못된 category `notFound()`.
- **`app/products/[category]/[slug]/page.tsx`** — 존재하는 slug 데이터시트 렌더 /
  없는 slug `notFound()`. `generateStaticParams` 가 전 제품을 반환하는지.
- **`components/layout/Sidebar.test.tsx`** — 기존 "N개 메뉴 링크" 테스트에
  "제품 정보" → `/products` 링크 1개 추가 검증.

## 14. Key Decisions Log

- **파일 기반 마크다운, Supabase 아님.** 이 프로젝트의 first-party 데이터
  관례(즐겨찾기/계정/업무 = Supabase + 웹 편집)를 의도적으로 깬다. 근거: 1차
  목표가 Claude/VSCode가 원본을 직접 읽는 것 / 정적 버전관리 참고 데이터 /
  깊은 중첩 스키마가 SQL보다 YAML에 맞음 / Supabase Storage를 정당화하던 유일한
  요소인 이미지가 이번 범위 밖.
- **대시보드 메뉴는 읽기 전용.** 편집 = VSCode + git 커밋 + 재배포. 편집자가
  본인 한 명이고 매일 repo 안에서 작업하므로 수용 가능.
- **스키마 = 공통 코어 + 분류별 확장, 3분류 전부 지금 설계** (사용자 선택).
  데이터는 벽재만 있어도.
- **총괄표는 코어 4컬럼(화재·환경표지·항균·유해물질) 고정** + 분류별 확장 컬럼을
  그 분류 그룹 안에서만 추가. 모든 분류가 하나의 축으로 비교됨.
- **사진 후속.** 스키마 `images: []` 는 파일명 자리로 유지. 저장 위치는 텍스트
  모델과 독립적으로 나중에 결정.
- **preview.html 팔레트 폐기**, 대시보드 토큰으로 재구성.
- **전 라우트 정적 생성(SSG), `force-dynamic` 금지.** Vercel 서버리스가 런타임
  `content/**` 파일 읽기를 번들에 자동 포함하지 않는 함정을 원천 회피. 데이터가
  재배포 시점에만 바뀌므로 정적이 정답이기도 함.
- **`/products/[category]` = 항목별 N열 비교 (사용자 명시)**. 데이터시트 섹션을
  섹션마다 한 번 그리고 그 아래 N제품 내용을 가로로 → "핵심 특징"이면 N제품
  핵심특징이 나란히, "타입별 규격"이면 N제품 규격표가 나란히. 전 제품 전체 내용이
  이 한 화면에 다 나온다 (개별 페이지로 분리 안 함). `[slug]` 단독 데이터시트는
  딥링크·단독 열람용으로 유지. 양식을 통일한 주 목적이 "여러 제품을 한 눈에
  비교"라서 이 구조가 정답 — preview.html 처럼 제품별 풀 데이터시트를 세로로
  쌓는 방식(스크롤하며 비교)은 배제.
- 데이터시트 섹션 렌더는 `components/products/datasheetSections.tsx` 한 곳에서
  셀 컴포넌트 + `DATASHEET_SECTIONS` 배열로 정의하고, 단독 뷰(`ProductDatasheet`)와
  비교 뷰(`ProductComparison`)가 공용한다.
- **파생 blob 커밋 안 함.** catalog는 정적 라우트가 로더에서 생성. export
  스크립트/신선도 테스트 없음.
- **본문 markdown 파서 미도입.** `body` 는 원문 복사엔 포함, 화면엔 `pre-line`
  평문. 유일한 새 의존성은 `gray-matter`.

## 15. Open Questions / 후속

- "Claude용 복사" 접두 문자열의 **회사/브랜드 표기** — 실제 회사명 필요.
- **바닥재 / 천장재 확장 속성 목록**(§6.3)은 가안. 첫 실제 제품 등록 시 상세자료로
  확정.
- **이미지 호스팅** 방식 (public/ vs Supabase Storage vs 외부) — 사진 작업 착수
  시점에.
- 제품별 raw `.md` 라우트 — v1 생략, 필요 시 추가.
- `discontinued` 제품을 총괄표에서 흐리게만 할지, 별도 접힘 처리할지 — 실제
  단종 제품이 생길 때 판단.
