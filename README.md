# 개인 업무 대시보드

즐겨찾기·계정관리·업무관리·제품 정보를 한 곳에서 관리하는 관리자 전용 개인 업무
대시보드입니다.

## 요구 사항

- Node.js 18.17 이상
- Supabase 프로젝트 1개

## 로컬 실행

1. 의존성 설치: `npm install`
2. `.env.local.example`을 복사해 `.env.local` 생성 후 값 채우기
3. 개발 서버 실행: `npm run dev`
4. 테스트 실행: `npm test`

## Supabase 설정

1. https://supabase.com 에서 새 프로젝트 생성
2. 프로젝트 설정 > API 메뉴에서 URL과 anon key를 `.env.local`의
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
3. Authentication > Users 메뉴에서 관리자 계정 1개를 직접 생성
   (회원가입 화면이 없으므로 반드시 Supabase 콘솔에서 생성해야 함)
   - 사용자 생성 시 "Auto Confirm User" 옵션을 반드시 체크할 것.
     체크하지 않으면 이메일 인증 전 상태가 되어 로그인 시
     "이메일이 아직 인증되지 않았습니다" 오류가 발생함
4. 생성한 관리자 이메일을 `.env.local`의 `ADMIN_EMAIL`에 입력
5. Authentication > Providers > Email 설정에서 "Enable Sign Ups"를 비활성화할 것.
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 공개 값이므로, 이를 비활성화하지 않으면
   누구나 Supabase Auth API를 직접 호출해 계정을 생성할 수 있음
   (대시보드 접근은 안 되지만 불필요한 사용자 데이터가 쌓일 수 있음)
6. Supabase 대시보드의 SQL Editor에서 `supabase/migrations/0002_favorites.sql`도
   같은 방식으로 붙여넣고 실행 (즐겨찾기 기능용 테이블)
7. `supabase/migrations/0003_accounts.sql`도 같은 방식으로 붙여넣고 실행
   (계정관리 기능용 테이블)
8. `supabase/migrations/0004_tasks.sql`, `0005_tasks_task_date.sql`, `0006_task_notes.sql`도
   순서대로 같은 방식으로 붙여넣고 실행 (업무관리 기능용 테이블)
9. 토큰 암호화 키 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   실행 결과를 `.env.local`의 `TOKEN_ENCRYPTION_KEY`에 입력 (64자리 16진수
   문자열이어야 함 — 계정관리의 아이디/비밀번호 암호화에 사용)
10. Supabase 프로젝트 설정 > API 메뉴에서 `service_role` 키를 복사해
    `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`에 입력 (이 키는 절대
    `NEXT_PUBLIC_` 접두사를 붙이지 말 것 — 브라우저에 노출되면 안 됨)

## GitHub / Vercel 연결

1. 이 저장소를 GitHub 원격 저장소에 push
2. Vercel에서 해당 GitHub 저장소를 Import
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`, `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
4. main 브랜치에 push하면 자동 배포됨

### 배포 시 주의사항

- **Env var 등록 순서**: 반드시 첫 Vercel 배포 **전에** Environment Variables를
  등록해야 함. `ADMIN_EMAIL`은 Edge 미들웨어에서 사용되는데, Next.js가 빌드 시점에
  이 값을 번들에 인라인(inline)하기 때문에, 첫 배포 이후 대시보드에서 값을 바꿔도
  재배포(redeploy) 전까지는 반영되지 않음

## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] UI 리디자인: 색상 토큰(다크/라이트), 사이드바 내비게이션, 아이콘, 타이포그래피
- [x] URL 즐겨찾기: 카테고리별 관리 페이지, 사이드바 연동
- [x] 계정관리: 카테고리별 카드 그리드, 아이디/비밀번호 암호화 저장·복사
- [x] 업무관리: 고정 업무(요일별 자동 재생성) + 일반 업무(날짜 지정) + 진행 메모 로그
- [x] 제품 정보: 파일 기반 카탈로그(벽/바닥/천장), 총괄표·데이터시트·복사(텍스트/마크다운/JSON/Claude용)
- [x] 별도 홈 대시보드 없음 — "/"·로그인 직후 모두 업무관리(`/tasks`)로 이동.
  사이드바 메뉴 순서도 업무관리 → 계정관리 → 즐겨찾기 → 제품 정보

### 제거된 기능

Gmail·Google Drive·Notion 연동은 실사용 결과 불필요하다고 판단해 2026-09에
완전히 제거했습니다 (라우트·OAuth 연동·요약카드·`oauth_tokens` 테이블까지 모두
정리, `supabase/migrations/0007_drop_oauth_tokens.sql`). 필요해지면 이 커밋
이전 git 이력에서 복구할 수 있습니다.

### 제품 정보 데이터 편집

제품 데이터는 Supabase가 아니라 저장소 파일이다. `content/products/SCHEMA.md`가
필드 정의의 단일 진실이고, 제품 하나 = `content/products/{wall,floor,ceiling}/{slug}/product.md`
파일 하나(YAML frontmatter + 본문). 대시보드 `/products`는 열람·복사 전용이며,
편집은 파일을 고쳐 커밋·재배포한다. Claude에게 "`content/products/SCHEMA.md` 읽고
그 스키마대로 …"라고 하면 구조 설명 없이 바로 작업할 수 있다.
