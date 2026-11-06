create table schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('시장조사', '미팅', '촬영', '전시회', '연차', '창동 본사')),
  start_date date not null,
  end_date date not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index schedules_date_range_idx on schedules (start_date, end_date);

alter table schedules enable row level security;

-- accounts/partners/hosting_sites와 동일하게 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
