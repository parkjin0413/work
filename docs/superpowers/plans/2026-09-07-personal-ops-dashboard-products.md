# "제품 정보" 메뉴 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (권장) 또는 superpowers:executing-plans 로 태스크 단위 구현. 스텝은 체크박스(`- [ ]`)로 추적.

**Goal:** 회사 제품(벽재/바닥재/천장재 + 하위 제품종류)을 고정 양식 마크다운으로 정리해 두고, `/products` 메뉴에서 총괄표·데이터시트로 열람하고 텍스트/마크다운/JSON/"Claude용" 블록으로 복사할 수 있게 한다. 편집은 파일에서, 대시보드는 읽기 전용.

**Architecture:** 이 프로젝트에서 **유일하게 Supabase를 쓰지 않는** first-party 데이터. `content/products/{wall,floor,ceiling}/{slug}/product.md`(YAML frontmatter + 본문)가 원본. `lib/products/productsStore.ts` 가 `gray-matter` 로 폴더를 읽어 스키마 기본값을 백필한 `Product[]` 를 반환. 3개 라우트(`/products`, `/products/[category]`, `/products/[category]/[slug]`)는 전부 **정적 생성(SSG)** — Vercel 서버리스가 런타임 `content/**` 읽기를 번들에 자동 포함하지 않는 함정을 회피하고, 데이터가 재배포 시점에만 바뀌므로 정적이 맞다. `/products/catalog.json` 은 `force-static` 라우트 핸들러.

**Tech Stack:** 기존 스택 재사용. **새 의존성: `gray-matter` 1개.** 아이콘은 `lucide-react` 의 `Package` 추가 사용. markdown 파서는 도입하지 않음(본문은 `pre-line` 평문).

**Spec:** [docs/superpowers/specs/2026-09-07-personal-ops-dashboard-products-design.md](../specs/2026-09-07-personal-ops-dashboard-products-design.md)

> **구현 중 확정된 변경 (이 계획서보다 스펙·아래 내용이 우선):**
> 1. **개별 제품 라우트 `/products/[category]/[slug]` 는 만들지 않는다.** 개별 데이터시트와
>    `/products/[category]` 비교 뷰가 같은 `datasheetSections.tsx` 를 공유해 고유 내용이 없다.
>    `/products/[category]` 가 그 분류 전 제품의 **항목별 N열 비교**(섹션마다 한 번 + N제품 가로).
>    검색 결과는 `/products/[category]#[slug]` 앵커로 연결. `ProductDatasheet.tsx` 없음.
> 2. **코어 속성 5개**: `fire`/`eco`/`hyg`/`voc`/`wtp` (방수·방습을 코어로 승격). 벽재 확장 `aco`/`imp`,
>    바닥재 확장 `slip`/`impact_sound`/`dim_stability`, 천장재 확장 `nrc`/`sag`/`humidity`.
>    값이 전무한 확장 컬럼은 `usedAttrsForCategory()` 로 총괄표에서 자동 숨김.
> 3. 데이터 출처 = 사내 최신 카탈로그. 제품 10종(벽재 3·바닥재 5·천장재 2). 회사명 "강산".

## Global Constraints

- 모든 사용자 노출 텍스트는 한글.
- **`/products` 하위 전 라우트는 정적**: `export const dynamic = "force-dynamic"` 금지. `[category]`/`[slug]` 는 `generateStaticParams` 로 전 조합 생성. `catalog.json` 라우트는 `export const dynamic = "force-static"`.
- 색상은 시맨틱 토큰 클래스(`bg-bg`/`bg-surface`/`bg-surface-hover`/`border-border`/`text-foreground`/`text-muted`/`bg-accent`/`hover:bg-accent-hover`/`text-accent-foreground`/`border-danger`/`text-danger`/`text-success`)만. raw Tailwind 팔레트 클래스 금지. preview.html 의 clay/slate/paper 팔레트는 쓰지 않는다.
- 규격 숫자는 Tailwind 기본 `font-mono` 스택. 새 폰트 추가 없음.
- 넓은 표/다이어그램은 `overflow-x-auto` 컨테이너로 감싼다. body 가로 스크롤 금지.
- 로더/렌더는 분류 매핑을 `lib/products/categories.ts`, 속성 정의를 `lib/products/attributeSchema.ts` 한 곳에서만 가져온다.
- **속성값 원칙(스키마 계승)**: 제품 문서의 `features`/`certifications` 에 실제로 적힌 내용에서만 `attributes` 값을 끌어온다. 미기재는 `false` 아닌 `null`. `fire` 는 국내 불연/준불연만.
- 각 Task 끝의 커밋은 **실행 시점에 사용자 승인을 받고** 진행한다(자동 커밋·푸시 금지). `npm run dev` 가 떠 있으면 `npm run build` 는 생략하고 그 사실을 보고한다.
- 복사 UX는 계정관리 패턴 재사용: `navigator.clipboard.writeText` + 1.6초 "복사됨 ✓" + `execCommand` 폴백.

---

### Task 1: 콘텐츠 이관 + SCHEMA.md 3분류 일반화

**Files:**
- Create: `content/products/SCHEMA.md` (wall-catalog-sample 것을 3분류로 재작성)
- Create: `content/products/wall/laminate-panel-10-2t/product.md` (이관 + 스키마 정합)
- Create: `content/products/wall/laminate-tile-hpl/product.md`
- Create: `content/products/wall/prime-perforated-board/product.md`
- Create: `content/products/wall/*/images/.gitkeep` (3개), `content/products/floor/.gitkeep`, `content/products/ceiling/.gitkeep`
- Modify: `package.json` (`gray-matter` 의존성 추가), `package-lock.json`
- Delete: `wall-catalog-sample/` 전체
- Test: 없음 (순수 콘텐츠 — Task 2 로더 테스트가 파싱을 검증)

**Interfaces:**
- Produces: `content/products/**` 파일 트리 + `SCHEMA.md`. Task 2 가 이 경로를 읽는다.

- [ ] **Step 1: `gray-matter` 설치** — `npm install gray-matter` (버전 핀 확인, `package.json` `dependencies` 에 들어갔는지).
- [ ] **Step 2: `content/products/SCHEMA.md` 작성** — 스펙 §6 그대로: 공통 frontmatter 필드 목록, `types[]` flat 규칙, 코어 속성 4개(`fire`/`eco`/`hyg`/`voc`) + 벽재 확장(`wtp`/`aco`/`imp`) + 바닥재 확장(`abrasion`/`impact_sound`/`heating`/`castor`/`dim_stability`/`slip`) + 천장재 확장(`nrc`/`light_weight`/`sag`/`humidity`), 속성값 원칙 4개, 데이터시트 11섹션 순서, "필드 항상 전부 / 빈 값은 정보 없음" 계약. 바닥/천장 확장은 "가안 — 첫 실제 제품 등록 시 확정" 명시.
- [ ] **Step 3: 벽재 3개 `product.md` 이관** — `wall-catalog-sample/content/products/wall/*/product.md` 내용을 옮기되 최종 스키마에 맞춰 조정:
  - `attributes` 키를 `{ fire, eco, hyg, voc, wtp, aco, imp }` 로. 기존 `saf`(항상 null) 제거.
  - `laminate-tile-hpl`: `voc: true` (근거: 인증표 "VOC 방출 A+"). 나머지 둘 `voc: null`.
  - `imp`: `laminate-tile-hpl` 은 `true` (근거: features "간헐적 뒤틀림에도 금이 가거나 깨지지 않는" ), `laminate-panel-10-2t` 는 `true` (근거: features "충격·마모·파손에 안전"), `prime-perforated-board` 는 `null`.
  - `aco`: `prime-perforated-board` 만 `true`, 나머지 `null`.
  - 그 외 값(features/highlight_features/types 규격/certifications/installation_methods 등)은 원문 유지. `status: active` 필드 추가.
- [ ] **Step 4: 빈 디렉터리 placeholder** — `content/products/wall/{slug}/images/.gitkeep` 3개, `content/products/floor/.gitkeep`, `content/products/ceiling/.gitkeep`.
- [ ] **Step 5: `wall-catalog-sample/` 삭제** — 폴더 전체 (`preview.html`, `lib-example/`, `content/`, `README.md`, `_generated/` 포함).
- [ ] **Step 6: 파싱 스모크 확인** — 임시 node 스크립트로 `gray-matter` 가 3개 파일을 에러 없이 파싱하는지 확인 후 스크립트 삭제. (`npx tsx` 없으므로 `.mjs` + `import matter from "gray-matter"`.)
- [ ] **Step 7: 커밋** (승인 후) — `feat: 제품 정보 콘텐츠 스키마 및 벽재 3종 이관`

---

### Task 2: 로더 (`productsStore` / `categories` / `attributeSchema`)

**Files:**
- Create: `lib/products/categories.ts`
- Create: `lib/products/attributeSchema.ts`
- Create: `lib/products/productsStore.ts`
- Create: `test/fixtures/products-minimal/wall/minimal/product.md` (최소 frontmatter 제품 1개)
- Test: `lib/products/categories.test.ts`, `lib/products/attributeSchema.test.ts`, `lib/products/productsStore.test.ts`

**Interfaces:**
- Consumes: `content/products/**` (Task 1), `gray-matter`.
- Produces:
  - `categories.ts`: `type CategorySlug = "wall" | "floor" | "ceiling"`, `type CategoryLabel = "벽재" | "바닥재" | "천장재"`, `CATEGORY_ORDER: CategorySlug[]`, `slugToLabel(slug): CategoryLabel`, `labelToSlug(label): CategorySlug`, `isCategorySlug(x): x is CategorySlug`.
  - `attributeSchema.ts`: `type AttrDef = { key: string; label: string; format: "flag" | "text" }`, `CORE_ATTRS: AttrDef[]`, `CATEGORY_ATTRS: Record<CategoryLabel, AttrDef[]>`, `attrsForCategory(label): AttrDef[]` (= CORE_ATTRS + CATEGORY_ATTRS[label]).
  - `productsStore.ts`: `type ProductAttributeValue`, `type ProductType`, `type Product`, `type CatalogRow`, `getAllProducts(rootDir?: string): Product[]`, `getProductsByCategory(label): Product[]`, `getProductBySlug(categorySlug, slug): Product | undefined`, `getRawMarkdown(categorySlug, slug): string | undefined`, `getCatalogRows(): CatalogRow[]`, `getCatalog(): { generatedAt: string; products: Product[] }`.
- Task 3·4·5 가 전부 이걸 소비.

- [ ] **Step 1: 실패 테스트 작성 — `categories.test.ts`** — `slugToLabel`/`labelToSlug` 왕복, `isCategorySlug` 참/거짓, `CATEGORY_ORDER` 순서(wall→floor→ceiling).
- [ ] **Step 2: 실패 테스트 작성 — `attributeSchema.test.ts`** — `CORE_ATTRS` 가 `fire,eco,hyg,voc` 4개, `attrsForCategory("벽재")` 가 코어 4 + `wtp,aco,imp`, `attrsForCategory("바닥재")` 가 코어 4 + 바닥 6개, `fire`/`abrasion`/`slip`/`nrc`/`impact_sound` 의 `format` 이 `"text"` 나머지 `"flag"`.
- [ ] **Step 3: 실패 테스트 작성 — `productsStore.test.ts`**:
  - 실제 `content/products/` 기준: `getAllProducts()` 가 벽재 3개 반환, 각 `category === "벽재"`, `laminate-tile-hpl` 의 `types` 길이 3·`colors` 5개·`certifications` 6개, `prime-perforated-board` 의 `types[0].group === "원형타공"` 및 `attributes.fire === "준불연"`.
  - `getProductsByCategory("바닥재")` → `[]`.
  - `getProductBySlug("wall", "laminate-panel-10-2t")` 정상 / `getProductBySlug("wall", "nope")` → `undefined`.
  - `getRawMarkdown("wall", "laminate-tile-hpl")` 가 `---` 로 시작하는 원문 문자열.
  - `getCatalogRows()` 길이 = 1 + 3 + 3 = 7, 각 행에 `category`/`productName`/`slug`/`typeName`/`size`/`attributes`.
  - `getCatalog()` 가 `{ generatedAt, products }` 이고 `products.length === 3`.
  - **백필**: `getAllProducts("test/fixtures/products-minimal")` 로 최소 제품을 읽어 `features`/`highlightFeatures`/`colors`/`certifications`/`installationMethods`/`finishingOptions`/`images` 가 전부 `[]`, `material`/`structure`/`summary` 가 `""`, `types` 가 최소 1행(없으면 빈 placeholder 행 1개 생성)임을 확인.
- [ ] **Step 4: 테스트 실패 확인** — `npx vitest run lib/products/`.
- [ ] **Step 5: `categories.ts` / `attributeSchema.ts` 구현** — 스펙 §6.3, §7.3 표 그대로 상수화.
- [ ] **Step 6: `productsStore.ts` 구현** — 핵심 shape:

```ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { CATEGORY_ORDER, slugToLabel, type CategorySlug } from "./categories";

export type ProductAttributeValue = string | boolean | null;

export type ProductType = {
  group: string | null;
  typeName: string; thickness: string; sizeWxhxt: string;
  weight: string; composition: string; surface: string; note: string;
  attributes: Record<string, ProductAttributeValue>;
};

export type Product = {
  category: "벽재" | "바닥재" | "천장재";
  categorySlug: CategorySlug;
  slug: string; name: string; productType: string;
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
  body: string;
  dir: string; // "content/products/wall/<slug>"
};

export type CatalogRow = {
  category: Product["category"]; productName: string; slug: string;
  typeName: string; group: string | null; size: string;
  attributes: Record<string, ProductAttributeValue>;
};

const DEFAULT_ROOT = path.join(process.cwd(), "content", "products");
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);

function normalizeType(raw: any): ProductType {
  return {
    group: raw?.group ?? null,
    typeName: str(raw?.type_name), thickness: str(raw?.thickness),
    sizeWxhxt: str(raw?.size_wxhxt), weight: str(raw?.weight),
    composition: str(raw?.composition), surface: str(raw?.surface), note: str(raw?.note),
    attributes: (raw?.attributes && typeof raw.attributes === "object") ? raw.attributes : {},
  };
}

function toProduct(fm: any, body: string, categorySlug: CategorySlug, slug: string): Product {
  const types = arr<any>(fm?.types).map(normalizeType);
  return {
    category: slugToLabel(categorySlug), categorySlug, slug,
    name: str(fm?.name) || slug,
    productType: str(fm?.product_type),
    status: fm?.status === "discontinued" ? "discontinued" : "active",
    summary: str(fm?.summary),
    features: arr<string>(fm?.features),
    highlightFeatures: arr<any>(fm?.highlight_features).map((h) => ({ title: str(h?.title), description: str(h?.description) })),
    material: str(fm?.material), structure: str(fm?.structure), installationSummary: str(fm?.installation_summary),
    colors: arr<string>(fm?.colors), colorsNote: str(fm?.colors_note),
    types: types.length ? types : [normalizeType({ type_name: "-" })],
    certifications: arr<any>(fm?.certifications).map((c) => ({ label: str(c?.label), standard: str(c?.standard), value: str(c?.value) })),
    certificationsNote: str(fm?.certifications_note),
    certificationDocuments: arr<string>(fm?.certification_documents),
    installationMethods: arr<any>(fm?.installation_methods).map((m) => ({
      methodName: str(m?.method_name),
      steps: arr<any>(m?.steps).map((s, i) => ({ step: typeof s?.step === "number" ? s.step : i + 1, title: str(s?.title), description: str(s?.description), image: str(s?.image) })),
    })),
    installationNote: str(fm?.installation_note),
    finishingOptions: arr<any>(fm?.finishing_options).map((f) => ({ name: str(f?.name), image: str(f?.image) })),
    images: arr<string>(fm?.images),
    dataNote: str(fm?.data_note),
    body: body.trim(),
    dir: `content/products/${categorySlug}/${slug}`,
  };
}

export function getAllProducts(rootDir: string = DEFAULT_ROOT): Product[] {
  const out: Product[] = [];
  for (const categorySlug of CATEGORY_ORDER) {
    const catDir = path.join(rootDir, categorySlug);
    if (!fs.existsSync(catDir)) continue;
    for (const slug of fs.readdirSync(catDir)) {
      const file = path.join(catDir, slug, "product.md");
      if (!fs.existsSync(file)) continue;
      const { data, content } = matter(fs.readFileSync(file, "utf-8"));
      out.push(toProduct(data, content, categorySlug, slug));
    }
  }
  return out;
}
// getProductsByCategory / getProductBySlug / getRawMarkdown / getCatalogRows / getCatalog 는 위 함수 위에 얇게 구현.
// getCatalog().generatedAt 은 테스트 안정성을 위해 고정 문자열 아님 — 대신 테스트는 존재만 확인.
```

- [ ] **Step 7: 테스트 통과 확인** — `npx vitest run lib/products/`.
- [ ] **Step 8: 커밋** (승인 후) — `feat: 제품 정보 로더와 분류·속성 스키마 추가`

---

### Task 3: `/products` 랜딩 + 총괄표 + 검색 + catalog.json

**Files:**
- Create: `app/products/catalog.json/route.ts`
- Create: `app/products/page.tsx`
- Create: `components/products/RollupTable.tsx`
- Create: `components/products/ProductSearch.tsx` (client)
- Create: `components/products/CopyButton.tsx` (재사용 복사 버튼 — client)
- Create: `components/products/CatalogCopyBar.tsx` (client — catalog.json 복사 + URL 안내)
- Test: `app/products/catalog.json/route.test.ts`, `app/products/page.test.tsx`, `components/products/RollupTable.test.tsx`, `components/products/ProductSearch.test.tsx`

**Interfaces:**
- Consumes: `productsStore` (`getCatalog`, `getCatalogRows`, `getAllProducts`), `attributeSchema` (`attrsForCategory`), `categories`.
- Produces: `CopyButton` (`{ text: string; label?: string; copiedLabel?: string }`) — Task 5 가 재사용. `RollupTable` (`{ rows: CatalogRow[] }`) — Task 4 가 재사용.

- [ ] **Step 1: 실패 테스트 작성**
  - `route.test.ts`: 핸들러 `GET` 호출 → `res.headers.get("content-type")` 에 `application/json`, `await res.json()` 의 `products.length === 3`.
  - `RollupTable.test.tsx`: 벽재 3제품 7행 rows 주입 → `WALL · 벽 마감재` 그룹 헤더 1개, 품목명 행 존재, 벽재 확장 컬럼 헤더(`방수·방습`/`흡음·차음`/`내충격`) 존재, `준불연` 텍스트 셀(프라임 타공보드) 존재.
  - `ProductSearch.test.tsx`: 제품 3개 주입 → 입력 "타공" 치면 프라임 타공보드만, 분류 칩 "벽재" 토글, "전체" 복귀.
  - `page.test.tsx`: `getCatalog`/`getCatalogRows`/`getAllProducts` mock → 총괄표 렌더, 분류 요약 카드 3장(벽재 3개 / 바닥재 0개 / 천장재 0개), Sidebar 존재.
- [ ] **Step 2: 테스트 실패 확인**.
- [ ] **Step 3: `catalog.json/route.ts`**:
```ts
import { getCatalog } from "@/lib/products/productsStore";
export const dynamic = "force-static";
export function GET() {
  return Response.json(getCatalog());
}
```
- [ ] **Step 4: `RollupTable.tsx`** (서버 컴포넌트) — preview.html `renderRollup` 이식. `rows` 를 `category` 로 그룹핑, 그룹마다 `attrsForCategory(label)` 로 `<thead>` 재생성. `format:"text"` → 값 문자열/`-`, `format:"flag"` → 채운 점/빈 점. `overflow-x-auto` 래핑. 범례 포함.
- [ ] **Step 5: `CopyButton.tsx`** (client) — 계정관리 복사 패턴. props `{ text, label = "복사", copiedLabel = "복사됨 ✓" }`.
- [ ] **Step 6: `ProductSearch.tsx`** (client) — props `{ products: {slug,name,productType,material,category,categorySlug,typeCount}[] }`. 상단 검색 input + 분류 칩. 필터 결과를 링크 카드(`/products/[categorySlug]/[slug]`)로. 순수 클라이언트 필터.
- [ ] **Step 7: `CatalogCopyBar.tsx`** (client) — `CopyButton` 로 catalog JSON 문자열 복사 + `/products/catalog.json` 경로 안내 텍스트(코드 스타일).
- [ ] **Step 8: `app/products/page.tsx`** (서버, 정적) — `Sidebar` + `<main>` 셸(tasks/favorites 와 동일), `<h1>제품 정보</h1>`, `CatalogCopyBar`, `RollupTable rows={getCatalogRows()}`, 분류별 요약 카드(제품 수 + `/products/[slug]` 링크), `ProductSearch`. `force-dynamic` 없음. 로더 throw 대비 tasks 페이지처럼 try/catch 인라인 에러 카드.
- [ ] **Step 9: 테스트 통과 확인** — `npx vitest run app/products/ components/products/`.
- [ ] **Step 10: 커밋** (승인 후) — `feat: 제품 정보 랜딩(총괄표·검색·catalog.json) 추가`

---

### Task 4: `/products/[category]` = 분류 전 제품 항목별 N열 비교

**Files:**
- Create: `components/products/datasheetSections.tsx` — 섹션별 셀 컴포넌트(`PerfCell`/`BasicInfoCell`/`HighlightsCell`/`FeaturesCell`/`TypesCell`/`ColorsCell`/`CertsCell`/`InstallCell`/`FinishingCell`/`ImagesCell`/`BodyCell`) + `SectionLabel`/`EmptyBlock`/`NoteBlock` + `DATASHEET_SECTIONS` 배열. 단독/비교 뷰 공용.
- Create: `components/products/ProductComparison.tsx` — 열 머리(제품명·타입칩·복사 4종·"단독 페이지" 링크) + `DATASHEET_SECTIONS` 를 섹션마다 한 번(`SectionLabel`) 그리고 그 아래 `grid-template-columns: repeat(N, minmax(280px,1fr))` 로 N제품 셀. `overflow-x-auto` 래핑.
- Create: `app/products/[category]/page.tsx`
- Test: `app/products/[category]/page.test.tsx`, `components/products/ProductComparison.test.tsx`

**Interfaces:**
- Consumes: `productsStore` (`getProductsByCategory`, `getCatalogRows`, `getRawMarkdown`), `categories`, `attributeSchema`, `attributes`, `copyText` (Task 5 에서 먼저 만들거나 이 태스크로 당김), `RollupTable` (Task 3).
- Produces: `datasheetSections` (Task 5 `ProductDatasheet` 가 재사용), `ProductComparison` (`{ items: ComparisonItem[] }`).

- [ ] **Step 1: 실패 테스트 작성**
  - `ProductComparison.test.tsx`: 3제품 items 주입 → 3개 제품명이 `h3` 열 머리로, 각 섹션 라벨이 **정확히 1번**(`getAllByText(label).toHaveLength(1)`), 제품마다 복사 버튼 4종·"단독 페이지" 링크 3개, 빈 섹션은 그 열만 "정보 없음".
  - `page.test.tsx`: `params.category="wall"` → 총괄표 + "항목별 비교" + 3제품 열 머리 + 단독 링크 3개. `"floor"` → "등록된 제품이 없습니다." (404 아님). `"roof"` → `notFound()`.
- [ ] **Step 2: 테스트 실패 확인**.
- [ ] **Step 3: `datasheetSections.tsx` 구현** — 각 셀은 제품 하나를 받아 그 섹션 본문만 렌더, 빈 값이면 `EmptyBlock`. preview.html 의 `renderTypes`/`renderCertifications`/`renderInstallation`/`renderHighlights` 가 출발점.
- [ ] **Step 4: `ProductComparison.tsx` 구현** (서버) — 위 Files 설명대로. `overflow-x-auto` + `minWidth = N*296`, 열 머리 `sticky top-0`.
- [ ] **Step 5: `app/products/[category]/page.tsx`** (서버, 정적):
```ts
export function generateStaticParams() {
  return CATEGORY_ORDER.map((category) => ({ category }));
}
export default function CategoryPage({ params }: { params: { category: string } }) {
  if (!isCategorySlug(params.category)) notFound();
  // getProductsByCategory(slugToLabel(params.category)) → 빈 배열이면 빈 상태,
  // 아니면 RollupTable(categories=[label]) + ProductComparison(items = 제품 + 복사 4문자열)
}
```
  셸은 tasks/favorites 와 동일. `<h1>{label}</h1>` + `/products` 로 돌아가는 링크. 로더 throw 대비 try/catch 인라인 에러 카드. 복사 문자열은 `copyText` + `getRawMarkdown` 로 서버에서 생성해 `items` 에 실어 내려줌.
- [ ] **Step 6: 테스트 통과 확인**.
- [ ] **Step 7: 커밋** (승인 후) — `feat: 제품 정보 분류 페이지 = 전 제품 항목별 비교 뷰`

---

### Task 5: `/products/[category]/[slug]` 데이터시트 + 복사 4종

**Files:**
- Create: `app/products/[category]/[slug]/page.tsx`
- Create: `components/products/ProductDatasheet.tsx` — 헤더 + `DATASHEET_SECTIONS`(Task 4) 를 세로로. 단독 열람용.
- Create: `components/products/ProductCopyButtons.tsx` (client) — Task 4 비교 뷰 열 머리에서도 재사용.
- Create: `lib/products/copyText.ts` (순수 함수) — Task 4 가 먼저 필요로 하므로 실제로는 Task 4 와 함께.
- Test: `lib/products/copyText.test.ts`, `components/products/ProductDatasheet.test.tsx`, `app/products/[category]/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: `productsStore` (`getAllProducts`, `getProductBySlug`, `getRawMarkdown`), `categories`, `attributeSchema`, `CopyButton` (Task 3).
- Produces: 없음 (Task 6 은 Sidebar 만).

- [ ] **Step 1: 실패 테스트 작성**
  - `copyText.test.ts`: `buildPlainText(product)` 가 `제품명:`/`[요약]`/`[타입별 규격]`/`[성능]` 섹션 포함, 빈 필드는 `정보 없음`. `buildClaudeBlock(product)` 가 첫 줄에 스키마 안내(`content/products/SCHEMA.md`) + 이어서 `buildPlainText` 결과.
  - `ProductDatasheet.test.tsx`: 꽉 찬 제품 → 11개 섹션 라벨 전부 존재. 빈 배열 제품(백필 최소 제품) → 각 섹션이 "정보 없음" 블록. 성능 배지가 `attrsForCategory` 순서.
  - `page.test.tsx`: `params={category:"wall",slug:"laminate-tile-hpl"}` → 데이터시트 + 4개 복사 버튼. 없는 slug → `notFound()`. `generateStaticParams` 가 3개(전 제품) 반환.
- [ ] **Step 2: 테스트 실패 확인**.
- [ ] **Step 3: `lib/products/copyText.ts`** — preview.html `buildCopyText` 이식 + 분류 확장 속성 포함 + `buildJson(product)` (= `JSON.stringify(product, null, 2)`) + `buildClaudeBlock`. 전부 순수 함수.
- [ ] **Step 4: `ProductDatasheet.tsx`** (서버) — preview.html `renderProduct` 이식, 11섹션(스펙 §6.5). 렌더 헬퍼(`renderTypes`/`renderCertifications`/`renderInstallation`/`renderHighlights`/`renderFinishing`/`renderImages`)를 이 파일 내부 함수로. 빈 값 → "정보 없음" 블록(섹션 유지). 11번 본문은 `whitespace-pre-line`. 성능 배지는 `attrsForCategory(product.category)`. 시맨틱 토큰만.
- [ ] **Step 5: `ProductCopyButtons.tsx`** (client) — props `{ plain: string; markdown: string; json: string; claude: string }`. `CopyButton` 4개 나란히(`텍스트`/`마크다운 원문`/`JSON`/`Claude용`). 서버 페이지에서 문자열을 만들어 prop 으로 내려줌(클라이언트에서 로더 접근 불가).
- [ ] **Step 6: `app/products/[category]/[slug]/page.tsx`** (서버, 정적):
```ts
export function generateStaticParams() {
  return getAllProducts().map((p) => ({ category: p.categorySlug, slug: p.slug }));
}
```
  `isCategorySlug` 체크 → `getProductBySlug` → 없으면 `notFound()`. `getRawMarkdown` 으로 원문. `copyText` 로 4문자열 생성 → `ProductCopyButtons` + `ProductDatasheet`. 셸 동일 + `/products/[category]` 로 돌아가는 링크. `discontinued` 면 "단종" 배지.
- [ ] **Step 7: 테스트 통과 확인** — `npx vitest run lib/products/ components/products/ "app/products/[category]/[slug]/"`.
- [ ] **Step 8: 커밋** (승인 후) — `feat: 제품 데이터시트와 복사(텍스트·마크다운·JSON·Claude용) 추가`

---

### Task 6: Sidebar 연동 + README + 최종 검증

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/Sidebar.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음 (링크만).
- Produces: 없음 (마지막 태스크).

- [ ] **Step 1: Sidebar 테스트 갱신** — `Sidebar.test.tsx` 의 `"7개의 메뉴 링크를 올바른 경로로 보여준다"` 를 `"8개..."` 로 바꾸고 `expect(screen.getByRole("link", { name: "제품 정보" })).toHaveAttribute("href", "/products");` 추가.
- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run components/layout/Sidebar.test.tsx`.
- [ ] **Step 3: Sidebar 수정** — `lucide-react` import 에 `Package` 추가, `NAV_ITEMS` 끝(`업무관리` 뒤)에 `{ href: "/products", label: "제품 정보", icon: Package },` 추가. 다른 변경 없음(`pathname?.startsWith` 이 `/products/*` 커버).
- [ ] **Step 4: 테스트 통과 확인**.
- [ ] **Step 5: README 업데이트** — "## 진행 현황" 리스트 끝에 `- [x] 제품 정보: 파일 기반 카탈로그(벽/바닥/천장), 총괄표·데이터시트·복사(텍스트/마크다운/JSON/Claude용)` 추가. "## 폴더" 류 설명이 있으면 `content/products/` 와 `SCHEMA.md` 를 편집 진입점으로 한 줄 안내 추가(스펙 §1의 "Claude에게 SCHEMA.md 읽고 그 스키마대로 해줘" 문구 요지).
- [ ] **Step 6: 최종 검증** — `npm test` 전체 통과(신규 파일 회귀 없음). `npm run dev` 가 떠 있지 않으면 `npm run build` 도 실행해 `/products`, `/products/[category]`, `/products/[category]/[slug]`, `/products/catalog.json` 이 **정적으로** 생성되는지 빌드 로그로 확인(● (SSG) 또는 ○). dev 가 떠 있으면 build 생략하고 보고.
- [ ] **Step 7: 커밋** (승인 후) — `feat: 사이드바에 제품 정보 메뉴 추가`

---

## 완료 기준

- `/products` 에서 벽재 3제품이 총괄표(코어 4컬럼 + 벽재 확장 3컬럼)로 보이고, 검색·분류 칩이 동작한다.
- `/products/wall/laminate-tile-hpl` 데이터시트 11섹션이 전부 뜨고(빈 항목은 "정보 없음"), 4개 복사 버튼이 각각 평문·마크다운 원문·JSON·Claude용 블록을 클립보드에 넣는다.
- `/products/catalog.json` 이 전 제품 JSON 을 준다.
- `/products/floor`, `/products/ceiling` 은 빈 상태 안내(404 아님).
- 전 라우트가 빌드 시 정적 생성된다(`force-dynamic` 없음).
- 새 의존성은 `gray-matter` 하나뿐. `wall-catalog-sample/` 는 삭제됐다.
- `npm test` 전 항목 통과.
