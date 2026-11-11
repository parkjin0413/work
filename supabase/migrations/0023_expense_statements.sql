-- 경비내역서 (양식 메뉴). 회사 엑셀 양식을 그대로 옮긴 것으로 한 장에 내역 18줄.
-- rows: [{kind: "general"|"car", date, description, amount, distance, note}]
--   자차(car) 금액 = 거리 ÷ 10 × fuel_price × 1.1 (원 단위 반올림), 저장할 때 계산해서 amount 에 넣는다.

create table if not exists expense_statements (
  id uuid primary key default gen_random_uuid(),
  drafter_name text not null,
  drafter_position text not null default '',
  written_at date not null,
  fuel_price integer check (fuel_price is null or fuel_price > 0), -- 그 달 가장 높게 주유한 단가(원/L)
  rows jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_statements_written_at_idx on expense_statements (written_at desc);

alter table expense_statements enable row level security;
-- 다른 표와 같이 서버(서비스 역할 키)에서만 접근한다. 정책을 두지 않아 anon/authenticated 접근은 막힌다.
