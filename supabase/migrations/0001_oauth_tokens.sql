create table if not exists oauth_tokens (
  provider text primary key,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table oauth_tokens enable row level security;

-- 이 테이블은 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
