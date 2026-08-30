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
4. 생성한 관리자 이메일을 `.env.local`의 `ADMIN_EMAIL`에 입력

## GitHub / Vercel 연결

1. 이 저장소를 GitHub 원격 저장소에 push
2. Vercel에서 해당 GitHub 저장소를 Import
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`)
4. main 브랜치에 push하면 자동 배포됨

## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [ ] 2단계: Gmail 연동
- [ ] 3단계: Google Drive 연동
- [ ] 4단계: Notion 연동
- [ ] 5단계: 홈 화면 통합
