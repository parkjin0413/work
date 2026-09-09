# 제품 데이터 스키마 — 벽재 / 바닥재 / 천장재

이 문서 하나가 단일 진실입니다. 제품 하나 = `product.md` 파일 하나이며, 모든
제품은 여기 정의된 필드를 **항상 전부** 갖습니다. 정보가 없으면 값을 비우되
(`[]` / `""` / `null`) 필드 자체를 생략하지 않습니다. 이렇게 해야 어떤 제품이
등록되어도 화면 구성이 흔들리지 않고 항상 같은 폼으로 비교할 수 있습니다.

> Claude/VSCode에게 작업을 시킬 때: "`content/products/SCHEMA.md` 읽고 그
> 스키마대로 [요청]"이라고 하면 구조 설명 없이 바로 이해합니다.

## 폴더 구조

```
content/products/
  SCHEMA.md                       ← 이 문서
  wall/    (벽재)
    {product-slug}/
      product.md                  ← 제품 하나 = 파일 하나
      images/                     ← 실제 사진 (현재 비어있음, product.md 의 images 에 파일명만 정의)
  floor/   (바닥재)
  ceiling/ (천장재)
```

폴더명 ↔ 분류 매핑: `wall`↔`벽재`, `floor`↔`바닥재`, `ceiling`↔`천장재`.
현재는 `wall/` 아래 3종만 채워져 있습니다.

## product.md 구조

frontmatter(YAML) + 본문(markdown) 두 부분. frontmatter는 아래 필드를 전부 갖습니다.

```yaml
category: 벽재 | 바닥재 | 천장재
slug: 제품-슬러그                  # 폴더명과 동일
name: 제품명
product_type: 형태 분류            # 예: HPL 방수 벽 패널
status: active | discontinued
summary: 한두 줄 요약

features: []                       # 특징 상세 (불릿), 없으면 []
highlight_features: []             # 카드형 핵심특징 {title, description}, 없으면 []

material: ""                       # 소재
structure: ""                      # 구조
installation_summary: ""           # 설치방식 한 줄 요약

colors: []                         # 색상/디자인 옵션
colors_note: ""                    # 왜 비어있는지 등 메모 (선택)

types: []                          # 아래 참고 — 절대 생략하지 않음, 최소 1행

certifications: []                 # 인증/시험성적서 목록 — 아래 "인증" 참고
certifications_note: ""            # 이 제품 인증 전반에 대한 메모 (선택)

installation_methods: []           # 순서 있는 시공 단계, 아래 참고
installation_note: ""

finishing_options: []              # 마감/몰딩 옵션 {name, image} — 순서 없음

images: []                         # 파일명만 (예: main-01.jpg). 실제 사진은 후속 작업
data_note: ""                      # "확인 필요" 메모 (선택)
```

## `types` — 타입/두께/패턴을 항상 평평한(flat) 표로

두께만 다른 제품이든(예: 4.2T / 4.5T / 5.0T), 패턴+두께로 갈리는 제품이든
(예: 원형타공 9T / 라인타공 10T·12T) 전부 `types` 배열의 행 하나로 표현합니다.
패턴 그룹이 없으면 `group: null`.

```yaml
types:
  - group: null                   # 패턴 그룹 없으면 null, 있으면 그룹명 (예: "원형타공")
    type_name: 10.2T
    thickness: 10.2mm
    size_wxhxt: 600 x 2400 x 10.2 mm
    weight: 22.6 kg               # 없으면 ""
    composition: Box 2ea / 포장면적 2.88 ㎡
    surface: HPL                  # 없으면 ""
    note: ""
```

`types` 에는 더 이상 `attributes`(성능값)를 손으로 넣지 않습니다. 총괄표의 성능
컬럼은 아래처럼 **`certifications` 에서 파생**됩니다.

## 성능 속성 — `certifications` 에서 파생 (총괄표 ↔ 개별 페이지 동기화)

제품 규격 총괄표의 성능 컬럼(화재·환경표지·항균·유해물질 + 분류 확장)은
그 제품의 **`certifications` 목록에서 자동으로 계산**합니다. 별도로 입력하는 값이
없으므로 개별 제품 페이지의 인증과 총괄표가 항상 일치합니다.

연결 방법: 각 인증 항목에 `feeds` 를 달아 어느 성능 컬럼을 채우는지 지정합니다.
시험성적서가 두께·패턴별로 다르면 `applies_to` 로 적용 타입을 한정합니다.

```yaml
certifications:
  - name: 준불연 성능 시험 (열방출·가스유해성)
    body: 한국건설생활환경시험연구원(KCL)
    number: CT25-111264K
    issued: "2026-01-16"       # 날짜는 반드시 따옴표 (YAML Date 파싱 방지)
    expires: 발급일로부터 3년      # 또는 "2029-01-15" 처럼 종료일
    result: 준불연             # text 컬럼이면 이 값이 그대로 총괄표에 들어감
    scope: 국내               # fire 는 scope 가 "국내" 일 때만 화재 컬럼에 반영
    feeds: fire               # 이 인증이 채우는 성능 컬럼 key (없으면 총괄표 미반영)
    applies_to: 10T           # 이 타입 행에만 반영 (쉼표로 여러 개: "10T, 12T"). 없으면 전 타입.
  - name: 환경표지 인증 (EL246)
    number: 제28042호
    feeds: eco               # flag 컬럼이면 "인증 있음 = 표시됨"
```

- `feeds` 없는 인증은 인증 표에만 나오고 총괄표엔 영향 없음.
- `applies_to` 없는 인증은 그 제품 전 타입에 반영. 값은 `type_name` 과 정확히 일치해야 함.
- 여러 인증이 같은 `feeds` 를 가리키면: flag 는 하나라도 있으면 표시, text 는 첫 값.
- key 라벨(항목/기관/번호/발급일/유효기간/결과·등급/기준/적용 타입/비고)은
  `lib/products/certLabels.ts` 에 정의. 그 밖의 key 는 원문 그대로 표시됩니다.

### 코어 속성 (전 분류 공통 · 총괄표 고정 컬럼)

| key | 라벨 | 값 |
|---|---|---|
| `fire` | 화재 | `null` / `"불연"` / `"준불연"` / `"방염"` — **국내 화재성능 성적서만** (해외 등급 제외) |
| `eco` | 환경표지 | `true` / `null` |
| `hyg` | 항균 | `true` / `null` — 항균/항바이러스 포함 |
| `voc` | 유해물질 | `true` / `null` — VOC/중금속/CMR 등 유해물질 저감 |

> `wtp`(방수·방습)는 대응하는 국내 시험성적서 체계가 없어 컬럼에서 제외했습니다.
> 방수 성능은 각 제품 `features` 서술로만 남깁니다.

확장 속성은 실제로 그 컬럼을 채우는 인증(`feeds`)이 있는 것만 정의합니다. 총괄표는
여기 정의된 확장 컬럼 중에서도 그 분류에 파생값이 전무하면 자동으로 숨깁니다.

### 벽재(`wall`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `aco` | 흡음·차음 | `"흡음계수 0.40"` 등 값 문자열 / `null` — 잔향실법 흡음계수 |
| `imp` | 내충격 | `true` / `null` |

### 바닥재(`floor`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `slip` | 미끄럼저항 | `"C.S.R 0.48 (건조)"` 등 값 문자열 / `null` — 시험성적서의 C.S.R 값 |
| `abrasion` | 내마모 | `"AC6"` / `"< 4.0mm³"` / `null` — 마모 저항 등급/값 |
| `dim_stability` | 치수안정성 | `true` / `null` — 두께 팽창률·특수 섬유층 적층 등 |

### 천장재(`ceiling`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `nrc` | 흡음률(NRC) | `"0.75"` / `true` / `null` — 수치 미표기 시 `true` |
| `sag` | 처짐저항 | `true` / `null` — "쉽게 변형되지 않는 유지력" 등 |
| `humidity` | 내습성 | `true` / `null` — 탈취·습도조절 포함 |

`fire` / `abrasion` / `slip` / `aco` / `nrc` 는 값 문자열을 그대로
표시(format `text`), 나머지는 값이 있으면 "표시됨" 표식(format `flag`).

> 데이터 출처: 사내 최신 카탈로그(불연/준불연 천장재, RF/프라임 타공 보드,
> 라미네이트 타일·판넬, Gerflor 항균 바닥재, 아티스틱 시트/타일, 리노륨 마모렛,
> 라미네이트 후로링). 카탈로그에 없는 항목은 비워두고 `_note` 에 사유를 남깁니다.

### 값을 채우는 원칙 (가장 중요)

1. **해당 제품 문서의 `features` / `certifications` 에 실제로 적힌 문장·인증명
   에서만** 값을 끌어옵니다. 다른 제품이나 예시 자료를 보고 유추하지 않습니다.
2. 언급이 없는 항목은 `false` 가 아니라 **`null`** 로 둡니다 ("명시적으로 없음"과
   "몰라서 비워둠"을 구분).
3. **총괄표 성능값은 손으로 넣지 않습니다.** `certifications` 의 `feeds` 로만
   채워지며(아래 "성능 속성"·"certifications" 참고), 인증이 없으면 총괄표도 빈 값.
4. **`fire` 컬럼은 국내 화재성능 성적서만** (불연 / 준불연 / 방염). 유럽 등급
   (Bfl-s1/Cfl-s1/D-s3,d0 등)은 `scope: 유럽(EU)` 로 두면 인증 표에만 나옵니다.
5. **시험성적서는 두께·패턴별로 다릅니다.** 한 타입만 해당하는 성적서는
   `applies_to: 4.5T` 처럼 적용 타입을 한정합니다. 총괄표는 타입 행마다 그 타입에
   적용되는 인증만으로 다시 계산합니다.

## `certifications` — 인증 / 시험성적서

각 항목은 **실제 시험성적서 1건**에 대응합니다. 필드는 자유 key 를 허용하되
자주 쓰는 key 는 아래처럼 씁니다. 값이 있는 key 만 화면에 나열됩니다(고정 항목 없음).

```yaml
certifications:
  - name: 준불연 성능 시험 (열방출·가스유해성)   # 시험/인증 이름
    body: 한국건설생활환경시험연구원(KCL)        # 발급 기관
    number: CT25-111264K                     # 성적서/인증 번호
    issued: "2026-01-16"                     # 발급일 — 반드시 따옴표
    expires: 발급일로부터 3년                   # 유효기간 (종료일 "2029-01-15" 도 가능)
    result: 준불연                            # 결과/등급
    scope: 국내                              # 국내 / 유럽(EU) / 기타
    feeds: fire                              # (선택) 총괄표 성능 컬럼 key
    applies_to: 10T                          # (선택) 적용 타입. 없으면 전 타입.
    note: ""                                 # (선택) 비고
certifications_note: ""                       # 이 제품 인증 전반 메모
```

총괄표 연동용 key:

| key | 의미 |
|---|---|
| `feeds` | 채울 성능 컬럼 key (fire/eco/hyg/voc/aco/imp/slip/abrasion/dim_stability/nrc/sag/humidity) |
| `result` | 그 컬럼에 들어갈 값 (text 컬럼이면 그대로, flag 컬럼이면 인증 존재만으로 표시) |
| `scope` | `국내` / `유럽(EU)` / `기타` — `fire` 는 `scope: 국내` 인 인증만 화재 컬럼에 반영 |
| `applies_to` | 적용 타입명(`type_name`). 쉼표로 여러 개(`"10T, 12T"`). 없으면 전 타입. |

`feeds` 를 달지 않은 인증은 개별 페이지 인증 목록에만 나오고 총괄표엔 영향 없음.
성적서가 없는 제품/타입은 `certifications: []` 로 비우고 `_note` 에 사유를 남깁니다.

## `installation_methods` — 순서가 있는 시공 단계

```yaml
installation_methods:
  - method_name: 홈-탭 결합식
    steps:
      - step: 1
        title: 목조틀 제작
        description: 가로 600, 세로 400 간격으로 목조틀 제작
        image: images/install-groove-01.jpg
```

`finishing_options` 는 순서 없는 마감재 선택지라 번호를 매기지 않습니다
(`{name, image}` 형태).

## 화면(데이터시트) 렌더링 순서 — 모든 제품 동일

1. 헤더: 제품명 + 성능 속성 배지(코어 + 분류 확장) + 요약 + 타입 칩 + 복사 버튼
2. 기본 정보 (소재 / 구조 / 설치방식 요약)
3. 핵심 특징 (카드 6개, 부족하면 빈 칸)
4. 특징 상세 (불릿)
5. 타입별 규격 표 (그룹 / 타입 / 두께 / 규격 / 중량 / 제품구성 / 표면 / 비고)
6. 색상 / 디자인 옵션
7. 인증 표 (인증/시험성적서 — 값 있는 필드만 표시)
8. 설치 방법
9. 마감 옵션
10. 이미지 자료 (파일명 자리표시자)
11. 제품 설명 (frontmatter 아래 markdown 본문 — 평문 그대로 표시)

빈 값은 섹션을 없애지 않고 "정보 없음"으로 표시합니다.

## 총괄표

`품목` + `규격(W×H×T)` + 코어 4컬럼(화재·환경표지·항균·유해물질) + 그 분류의
확장 컬럼. 확장 컬럼 세트가 분류마다 다르므로 카테고리 그룹(WALL / FLOOR /
CEILING)마다 헤더를 다시 그립니다. **성능 컬럼 값은 각 제품의 `certifications`
(`feeds`)에서 파생**되므로 개별 페이지 인증과 항상 동기화됩니다. 파생값이 없는
확장 컬럼은 자동으로 숨깁니다.

인쇄용 총괄표는 `/products/print/rollup` (가로 A4). 인증·성능 항목의 국내 기준
요약은 `lib/products/certStandards.ts` (화면·인쇄 both 렌더).
