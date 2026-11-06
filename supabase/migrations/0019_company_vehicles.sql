-- 직원 개인 차량번호
alter table employees add column if not exists car_number text;

-- 회사 차량 (트럭 등). 차종과 차량번호만 관리한다.
create table if not exists company_vehicles (
  id uuid primary key default gen_random_uuid(),
  model text,
  plate_number text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table company_vehicles enable row level security;

-- partners/employees와 동일하게 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
