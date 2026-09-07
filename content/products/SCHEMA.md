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

certifications: []                 # {label, standard, value}
certifications_note: ""            # 시험규격을 못 채운 이유 등 (선택)
certification_documents: []        # 보유 인증서 이름 목록

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
    attributes:                   # 아래 "성능 속성" — 총괄표에서 이 값을 그대로 씀
      fire: null
      eco: null
      hyg: null
      voc: null
      wtp: null
      # + 분류별 확장 키 (아래)
```

## 성능 속성 (`types[].attributes`)

나중에 벽·바닥·천장 전 품목을 SKU 단위로 모은 "제품 규격 총괄표"를 뽑을
계획이라, 그 표에 바로 쓸 수 있게 타입마다 이 값들을 둡니다.

### 코어 속성 (전 분류 공통 · 총괄표 고정 컬럼)

| key | 라벨 | 값 |
|---|---|---|
| `fire` | 화재 | `null` / `"불연"` / `"준불연"` — **국내 불연/준불연 기준만** |
| `eco` | 환경표지 | `true` / `null` |
| `hyg` | 항균 | `true` / `null` — 항균/항바이러스 포함 |
| `voc` | 유해물질 | `true` / `null` — VOC/중금속/CMR 등 유해물질 저감 |
| `wtp` | 방수·방습 | `true` / `null` — 벽·바닥·천장 전반에 공통으로 등장해 코어로 승격 |

확장 속성은 **현재 카탈로그에 실제로 값이 있는 것만** 둡니다. 새 확장 키가
필요하면(예: 강화마루 내마모 AC등급) 실제 값과 함께 추가합니다. 총괄표는 여기
정의된 확장 컬럼 중에서도 그 분류에 값이 전무하면 자동으로 숨깁니다.

### 벽재(`wall`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `aco` | 흡음·차음 | `true` / `null` |
| `imp` | 내충격 | `true` / `null` |

### 바닥재(`floor`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `slip` | 미끄럼저항 | `"R9"` / `"R10"` / `"R11"` / `"DS"` / `null` — 젖은 신발 미끄럼 방지 등급 |
| `abrasion` | 내마모 | `"AC6"` / `"< 4.0mm³"` / `null` — 마모 저항 등급/값 |
| `dim_stability` | 치수안정성 | `true` / `null` — 두께 팽창률·특수 섬유층 적층 등 |

### 천장재(`ceiling`) 확장

| key | 라벨 | 값 |
|---|---|---|
| `nrc` | 흡음률(NRC) | `"0.75"` / `true` / `null` — 수치 미표기 시 `true` |
| `sag` | 처짐저항 | `true` / `null` — "쉽게 변형되지 않는 유지력" 등 |
| `humidity` | 내습성 | `true` / `null` — 탈취·습도조절 포함 |

`fire` / `abrasion` / `impact_sound` / `slip` / `nrc` 는 값 문자열을 그대로
표시(format `text`), 나머지는 값이 있으면 "표시됨" 표식(format `flag`).

> 데이터 출처: 사내 최신 카탈로그(불연/준불연 천장재, RF/프라임 타공 보드,
> 라미네이트 타일·판넬, Gerflor 항균 바닥재, 아티스틱 시트/타일, 리노륨 마모렛,
> 라미네이트 후로링). 카탈로그에 없는 항목은 비워두고 `_note` 에 사유를 남깁니다.

### 값을 채우는 원칙 (가장 중요)

1. **해당 제품 문서의 `features` / `certifications` 에 실제로 적힌 문장·인증명
   에서만** 값을 끌어옵니다. 다른 제품이나 예시 자료를 보고 유추하지 않습니다.
2. 언급이 없는 항목은 `false` 가 아니라 **`null`** 로 둡니다 ("명시적으로 없음"과
   "몰라서 비워둠"을 구분).
3. **`fire` 는 국내 불연/준불연 등급만.** 해외 기준(예: 유럽 Euroclass
   EN13501-1 의 "D-s3,d0")은 여기 넣지 않고 `certifications` 배열에만 원문 그대로
   남깁니다.
4. 인증번호(SINTEF, KFPI, ETA, CT 코드 등)에 대응하는 정확한 시험 규격을 교차
   확인 못 하면 `certifications[].standard` 를 빈 문자열로 두고
   `certifications_note` 에 사유를 남깁니다. 추정해서 넣지 않습니다.

## `certifications` — 항상 3개 키 (항목 / 시험규격 / 결과)

```yaml
certifications:
  - label: 제품성능 인증
    standard: ""                  # 확인 안 되면 빈 문자열
    value: SINTEF-2410
```

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
7. 인증 표 + 보유 인증서 목록
8. 설치 방법
9. 마감 옵션
10. 이미지 자료 (파일명 자리표시자)
11. 제품 설명 (frontmatter 아래 markdown 본문 — 평문 그대로 표시)

빈 값은 섹션을 없애지 않고 "정보 없음"으로 표시합니다.

## 총괄표

`품목` + `규격(W×H×T)` + 코어 4컬럼(화재·환경표지·항균·유해물질) + 그 분류의
확장 컬럼. 확장 컬럼 세트가 분류마다 다르므로 카테고리 그룹(WALL / FLOOR /
CEILING)마다 헤더를 다시 그립니다. 모든 값은 각 제품 원문에 명시된 내용만
반영하며, 미기재 항목은 추정하지 않습니다.
