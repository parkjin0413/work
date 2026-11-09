-- 양식 문서: 품의서 · 휴가신청서 (dateout 프로젝트에서 옮겨옴)
-- 작성자는 나 혼자라 기안자 계정 대신 기안 당시의 이름·부서·직급을 문서에 그대로 남긴다.
-- 결재자는 직원명단(employees)에서 고르고, 문서에는 [{order, employeeId, name, jobTitle}] 로 저장한다.

create table if not exists expense_reports (
  id uuid primary key default gen_random_uuid(),
  doc_number text not null unique,
  drafter_name text not null,
  drafter_position text not null default '',
  department text not null default '',
  drafted_at date not null,
  title text not null,
  content text not null default '',
  items jsonb not null default '[]'::jsonb, -- [{description, vendor, amount}]
  total_amount numeric not null default 0,
  consultations jsonb not null default '[]'::jsonb, -- [{department}]
  instructions text not null default '',
  attachment_types jsonb not null default '[]'::jsonb, -- ["견적서", ...]
  attachment_other text not null default '',
  approvers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_reports_drafted_at_idx on expense_reports (drafted_at desc);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  doc_number text not null unique,
  drafter_name text not null,
  drafter_position text not null default '',
  department text not null default '',
  drafted_at date not null,
  start_date date not null,
  end_date date not null,
  days numeric not null check (days > 0),
  leave_type text not null check (
    leave_type in ('연차', '오전반차', '오후반차', '병가', '경조휴가', '공가', '기타', '연차+오전반차', '오후반차+연차')
  ),
  reason text not null default '',
  substitute_job_title text not null default '',
  substitute_name text not null default '',
  leave_balance jsonb not null default '{}'::jsonb, -- {annual:{total,priorUsed,used,remaining}, substitute:{...}}
  approvers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leave_requests_drafted_at_idx on leave_requests (drafted_at desc);

alter table expense_reports enable row level security;
alter table leave_requests enable row level security;
-- 다른 표와 같이 서버(서비스 역할 키)에서만 접근한다. 정책을 두지 않아 anon/authenticated 접근은 막힌다.

-- 내 도장 이미지: 비공개 버킷, 서버에서 서명 URL 로만 보여준다.
insert into storage.buckets (id, name, public)
values ('form-stamps', 'form-stamps', false)
on conflict (id) do nothing;
