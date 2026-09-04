create table task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekday integer not null check (weekday between 0 and 6), -- 0=월 ... 6=일
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references task_templates(id) on delete set null,
  name text not null,
  memo text,
  weekday integer check (weekday between 0 and 6), -- 고정 업무 인스턴스만 값이 있음 (템플릿에서 복사)
  week_start date, -- 고정 업무 인스턴스가 속한 주의 월요일. 수시 업무는 null
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index tasks_week_start_idx on tasks(week_start);
create index tasks_template_id_week_start_idx on tasks(template_id, week_start);

alter table task_templates enable row level security;
alter table tasks enable row level security;

-- 이 두 테이블은 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
