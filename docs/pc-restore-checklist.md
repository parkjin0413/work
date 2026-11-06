# PC 포맷 전/후 복구 체크리스트

이 문서는 GitHub에 올라가 있으므로, 포맷 후에도
`https://github.com/parkjin0413/work` 에서 바로 열어볼 수 있습니다.

> ⚠️ 이 파일에는 **비밀값을 절대 적지 않습니다.** 변수 "이름"만 적습니다.
> 실제 값은 아래 백업 폴더(USB 등)와 Vercel 환경변수에만 둡니다.

---

## 1. 포맷 전에 반드시 백업 — 이 PC에만 있는 것

| 우선순위 | 대상 | 경로 | 잃으면 생기는 일 |
|---|---|---|---|
| **1 (최우선)** | `.env.local` | `Desktop\VSCODE\work\.env.local` | 아래 "암호화 키 경고" 참고 |
| 2 | `hp/` 폴더 (17개 html, 252KB) | `Desktop\VSCODE\work\hp\` | 회사 홈페이지 원본. 제품 정보 교차검증용 기준 자료 (git 미추적) |
| 3 | Claude 프로젝트 메모리 | `C:\Users\Windows11\.claude\projects\c--Users-Windows11-Desktop-VSCODE-work\memory\` | 프로젝트 맥락·과거 의사결정 기록(약 80KB). 없으면 다음 세션이 처음부터 다시 파악해야 함 |
| 4 | 전역 작업 규칙 | `C:\Users\Windows11\.claude\CLAUDE.md` | 작업 방식 설정 |
| 5 (선택) | 과거 대화 기록 | `C:\Users\Windows11\.claude\projects\...\*.jsonl` (6.4MB) | 지난 세션 로그. 없어도 메모리만 있으면 대부분 복구됨 |

### ⚠️ 암호화 키 경고 (가장 중요)

`.env.local`의 **`TOKEN_ENCRYPTION_KEY`** 는 **계정관리 메뉴의 비밀번호를 AES-256-GCM으로
암호화**하는 키입니다. Supabase에는 암호문만 저장돼 있어서, **이 키를 잃으면 저장된
비밀번호를 영원히 복호화할 수 없습니다.** 데이터베이스가 멀쩡해도 소용없습니다.

이중 안전장치: 같은 값이 **Vercel 환경변수**에도 등록돼 있습니다.
포맷 전에 Vercel 대시보드 → 프로젝트 `work` → Settings → Environment Variables 에서
`TOKEN_ENCRYPTION_KEY` 값을 눈으로 확인(또는 복사)해두면, USB를 잃어버려도 복구됩니다.

### 백업 명령 (PowerShell, USB가 `E:` 인 경우)

```powershell
# 백업 폴더 생성
New-Item -ItemType Directory -Force E:\work-backup

# 1) 환경변수 파일
Copy-Item "$env:USERPROFILE\Desktop\VSCODE\work\.env.local" E:\work-backup\

# 2) 홈페이지 원본
Copy-Item "$env:USERPROFILE\Desktop\VSCODE\work\hp" E:\work-backup\hp -Recurse

# 3~5) Claude 설정·메모리·대화기록
Copy-Item "$env:USERPROFILE\.claude\CLAUDE.md" E:\work-backup\
Copy-Item "$env:USERPROFILE\.claude\projects" E:\work-backup\claude-projects -Recurse

# 백업 확인 (.env.local 이 실제로 들어갔는지 눈으로 확인)
Get-ChildItem E:\work-backup -Recurse -Depth 1 | Select-Object FullName, Length
```

---

## 2. 백업할 필요 없는 것 — 이미 클라우드에 있음

| 대상 | 어디에 | 비고 |
|---|---|---|
| 소스 코드 전체 | GitHub `parkjin0413/work` (master) | 커밋 안 된 변경이 없는지만 확인 |
| 모든 데이터 (업무·진행메모·계정·즐겨찾기·거래처·직원명단) | Supabase `urcdwhuiszggdaeksmcz` (서울) | PC와 무관 |
| 배포·환경변수 | Vercel 프로젝트 `work` | 포맷해도 사이트는 계속 돌아감 |
| `node_modules`, `.next` | — | `npm install` 로 재생성 |
| 제품 정보 데이터 | GitHub (`content/products/`) | 커밋돼 있음 |

---

## 3. 포맷 직전 마지막 확인 (30초)

```powershell
cd $env:USERPROFILE\Desktop\VSCODE\work
git status          # "nothing to commit" + hp/ 만 untracked 여야 정상
git log origin/master..HEAD   # 아무것도 안 나와야 함 (= 푸시 안 된 커밋 없음)
```

둘 다 깨끗하면 코드는 100% GitHub에 있는 상태입니다.

---

## 4. 포맷 후 복구 순서

### 4-1. 프로그램 설치
1. **Git for Windows** — <https://git-scm.com>
2. **Node.js** — 포맷 전 사용 버전: **v24.19.0** (npm 11.17.0). LTS 최신으로 받아도 무방
3. **VS Code** — <https://code.visualstudio.com>
4. **Claude Code** — VS Code 확장 설치 후 로그인

### 4-2. 코드 받기
```powershell
cd $env:USERPROFILE\Desktop
New-Item -ItemType Directory -Force VSCODE
cd VSCODE
git clone https://github.com/parkjin0413/work.git
cd work
```
> GitHub 로그인 창이 뜨면 계정(parkjin0413)으로 인증합니다.

### 4-3. 백업 복원
```powershell
# 환경변수 (이게 없으면 앱이 아예 안 뜹니다)
Copy-Item E:\work-backup\.env.local $env:USERPROFILE\Desktop\VSCODE\work\

# 홈페이지 원본
Copy-Item E:\work-backup\hp $env:USERPROFILE\Desktop\VSCODE\work\hp -Recurse

# Claude 설정·메모리
New-Item -ItemType Directory -Force $env:USERPROFILE\.claude
Copy-Item E:\work-backup\CLAUDE.md $env:USERPROFILE\.claude\
Copy-Item E:\work-backup\claude-projects $env:USERPROFILE\.claude\projects -Recurse
```

> `.env.local` 을 잃어버린 경우: Vercel 대시보드 → `work` → Settings →
> Environment Variables 에서 아래 9개를 그대로 복사해 새로 만듭니다.
> `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` /
> `ADMIN_EMAIL` / `TOKEN_ENCRYPTION_KEY` / `NOTION_API_KEY` /
> `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`

### 4-4. 실행
```powershell
npm install
npm run dev
```
→ <http://localhost:3000> 접속 후 관리자 계정으로 로그인

---

## 5. 복구 검증 체크리스트

| 확인 | 정상 기준 |
|---|---|
| 로그인 | 관리자 이메일로 로그인됨 (안 되면 `ADMIN_EMAIL`·Supabase 키 확인) |
| `/tasks` 업무관리 | 업무 카드와 진행 메모가 보임 |
| **`/accounts` 계정관리** | **비밀번호 눈 아이콘을 눌렀을 때 평문이 제대로 보임** ← `TOKEN_ENCRYPTION_KEY` 가 올바르다는 결정적 증거. 깨져 보이면 키가 다른 것이니 즉시 중단하고 Vercel 값과 대조 |
| `/products` 제품정보 | 제품 12종(벽재 3·바닥재 7·천장재 2) 표시 |
| `npm test` | 316개 통과 |
| `npm run build` | 성공 (dev 서버 꺼둔 상태에서 실행) |

---

## 6. 참고 — 이 프로젝트 고정 정보

- GitHub: **`https://github.com/parkjin0413/work`**
- Supabase 프로젝트 ref: `urcdwhuiszggdaeksmcz` (리전 `ap-northeast-2` 서울)
- Vercel 프로젝트: `work` (함수 리전 `icn1` 서울, `vercel.json` 에 고정)
- 주 브랜치: `master` (PR 없이 master 직접 작업)
- Supabase 마이그레이션: `supabase/migrations/` — **새 PC에서 다시 실행할 필요 없음**
  (이미 운영 DB에 적용돼 있음)
