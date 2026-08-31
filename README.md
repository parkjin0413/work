# 개인 업무 대시보드

Gmail, Google Drive, Notion을 한 곳에서 관리하는 관리자 전용 개인 업무 대시보드입니다.

## 요구 사항

- Node.js 18.17 이상
- Supabase 프로젝트 1개
- Google Cloud 프로젝트 1개 (Gmail/Drive 연동 단계에서 필요)
- Notion Internal Integration (Notion 연동 단계에서 필요)

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

## Google 연동 설정 (Gmail/Drive)

1. https://console.cloud.google.com 에서 새 프로젝트 생성
2. "API 및 서비스 > OAuth 동의 화면"에서 User Type을 "외부"로 선택하고,
   게시 상태를 반드시 **"테스트"**로 유지 (심사 불필요). "테스트 사용자"에
   본인 Google 계정 이메일을 추가
3. "API 및 서비스 > 라이브러리"에서 Gmail API와 Google Drive API를 각각 사용 설정
4. "API 및 서비스 > 사용자 인증 정보"에서 OAuth 클라이언트 ID 생성
   (애플리케이션 유형: 웹 애플리케이션). "승인된 리디렉션 URI"에
   `http://localhost:3000/api/auth/google/callback` (로컬 개발용)과
   배포 후에는 `https://<Vercel 도메인>/api/auth/google/callback`을 등록
5. 발급받은 클라이언트 ID/보안 비밀번호를 `.env.local`의
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력하고,
   `GOOGLE_REDIRECT_URI`에는 4번에서 등록한 콜백 URL을 그대로 입력
6. 토큰 암호화 키 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   실행 결과를 `.env.local`의 `TOKEN_ENCRYPTION_KEY`에 입력
   (64자리 16진수 문자열이어야 함)
7. Supabase 프로젝트 설정 > API 메뉴에서 `service_role` 키를 복사해
   `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`에 입력 (이 키는 절대
   `NEXT_PUBLIC_` 접두사를 붙이지 말 것 — 브라우저에 노출되면 안 됨)
8. Supabase 대시보드의 SQL Editor에서 `supabase/migrations/0001_oauth_tokens.sql`
   내용을 실행해 `oauth_tokens` 테이블 생성

### Google 연동 시 알아둘 점

- **"Google에서 확인하지 않은 앱입니다" 경고**: OAuth 동의 화면에서 이 경고가 뜨는 것은
  정상입니다 (Gmail/Drive 스코프가 민감 스코프이기 때문). "고급"을 클릭한 뒤
  "\<앱 이름\>(으)로 이동(안전하지 않음)"을 눌러 계속 진행하세요. 본인이 테스트
  사용자로 등록한 계정이라면 안전합니다.
- **토큰 7일 만료**: OAuth 동의 화면이 "테스트" 게시 상태인 동안 발급되는
  refresh token은 7일 후 자동 만료됩니다. 이 기간이 지나면 Gmail/Drive 페이지에
  재연결 안내가 표시되며, "Google 계정 다시 연결"을 눌러 다시 동의하면 됩니다.

## Notion 연동 설정

1. https://www.notion.so/my-integrations 에서 "새 통합 만들기"로 Internal
   Integration 생성 (이름 예: "개인 업무 대시보드")
2. 생성된 "Internal Integration Secret" 값을 복사해 `.env.local`의
   `NOTION_API_KEY`에 입력
3. Notion에서 대시보드에 표시하고 싶은 데이터베이스를 열고, 우측 상단 "..."
   메뉴 > "연결 추가"(Add connections)에서 2번에서 만든 Integration을 선택해
   공유 (이 단계는 API로 자동화할 수 없으며, 대시보드에 보이길 원하는
   데이터베이스마다 반복해야 함)
4. 공유하지 않은 데이터베이스는 대시보드에 나타나지 않음 — 새 데이터베이스를
   추가하고 싶다면 3번 과정을 반복

**참고**: `@notionhq/client`는 `2.x` 버전에 고정되어 있습니다. 5.x부터는 Notion의
"멀티소스 데이터베이스" 모델로 API 타입이 바뀌어 이 앱이 사용하는 조회 방식
(`search`의 `object: "database"` 필터)과 호환되지 않습니다. `npm install
@notionhq/client@latest`로 임의 업그레이드하지 마세요.

## GitHub / Vercel 연결

1. 이 저장소를 GitHub 원격 저장소에 push
2. Vercel에서 해당 GitHub 저장소를 Import
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NOTION_API_KEY`).
   `GOOGLE_REDIRECT_URI`는 실제 배포 도메인의 콜백 URL로 설정할 것
   (`https://<Vercel 도메인>/api/auth/google/callback`)
4. main 브랜치에 push하면 자동 배포됨

### 배포 시 주의사항

- **Env var 등록 순서**: 반드시 첫 Vercel 배포 **전에** Environment Variables를
  등록해야 함. `ADMIN_EMAIL`은 Edge 미들웨어에서 사용되는데, Next.js가 빌드 시점에
  이 값을 번들에 인라인(inline)하기 때문에, 첫 배포 이후 대시보드에서 값을 바꿔도
  재배포(redeploy) 전까지는 반영되지 않음

## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [x] 3단계: Google Drive 연동
- [x] 4단계: Notion 연동
- [x] 5단계: 홈 화면 통합
- [x] UI 리디자인: 색상 토큰(다크/라이트), 사이드바 내비게이션, 아이콘, 타이포그래피
