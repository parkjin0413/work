create table hosting_sites (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  site_url text,

  -- 호스팅
  hosting_provider text,
  hosting_product text,
  hosting_start_date date,
  hosting_end_date date,
  hosting_cost text,
  hosting_console_url text,
  hosting_username text,
  hosting_password_encrypted text,

  -- 도메인 · SSL (ssl_enabled null = 미확인)
  primary_domain text,
  domain_registrar text,
  domain_end_date date,
  connected_domains text,
  ssl_enabled boolean,
  ssl_provider text,
  ssl_end_date date,

  -- 관리자 페이지
  admin_url text,
  admin_username text,
  admin_password_encrypted text,

  -- FTP
  ftp_host text,
  ftp_port text,
  ftp_username text,
  ftp_password_encrypted text,

  -- 데이터베이스
  db_host text,
  db_username text,

  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table hosting_sites enable row level security;

-- accounts/partners와 동일하게 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
-- *_password_encrypted는 평문이 아니라 lib/crypto/tokenCipher.ts로 암호화된 값이 저장됩니다.
