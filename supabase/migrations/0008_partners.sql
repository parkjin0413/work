create table partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  representative text,
  address text,
  business_number text,
  phone text,
  email text,
  registration_file_path text,
  registration_file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table partners enable row level security;

-- accounts 테이블과 동일하게 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.

insert into storage.buckets (id, name, public)
values ('partner-files', 'partner-files', true)
on conflict (id) do nothing;

-- partner-files 버킷 업로드/삭제는 서비스 역할 키로만 수행하며(RLS 우회),
-- public 버킷이므로 사업자등록증 열람/썸네일은 공개 URL로 바로 접근 가능합니다.
