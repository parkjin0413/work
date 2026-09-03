create table account_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references account_categories(id) on delete cascade,
  name text not null,
  url text not null,
  username text not null,
  password_encrypted text not null,
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table account_categories enable row level security;
alter table accounts enable row level security;

-- 이 두 테이블은 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
-- password_encrypted는 평문이 아니라 lib/crypto/tokenCipher.ts로 암호화된 값이 저장됩니다.
