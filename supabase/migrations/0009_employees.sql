create table employee_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references employee_departments(id) on delete cascade,
  name text not null,
  position text,
  status_note text,
  partner_id uuid references partners(id) on delete set null,
  work_location text,
  phone text,
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  birthday_calendar text check (birthday_calendar in ('solar', 'lunar')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table employee_departments enable row level security;
alter table employees enable row level security;

-- accounts/partners와 동일하게 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.

-- 기존 직원명부 시드 데이터 (부서 순서: 대표 > 영업1부 > 영업2부 > 관리부 > 설계부 > 공사부 > 홍보부 > 자재부)
insert into employee_departments (id, name, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', '대표', 0),
  ('a1000000-0000-0000-0000-000000000002', '영업1부', 1),
  ('a1000000-0000-0000-0000-000000000003', '영업2부', 2),
  ('a1000000-0000-0000-0000-000000000004', '관리부', 3),
  ('a1000000-0000-0000-0000-000000000005', '설계부', 4),
  ('a1000000-0000-0000-0000-000000000006', '공사부', 5),
  ('a1000000-0000-0000-0000-000000000007', '홍보부', 6),
  ('a1000000-0000-0000-0000-000000000008', '자재부', 7);

insert into employees (department_id, name, position, status_note, partner_id, work_location, phone, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', '장준호', '대표이사', null, null, null, '010-9369-5222', 0),

  ('a1000000-0000-0000-0000-000000000002', '조은아', '전무', null, (select id from partners where company_name = '엘가디자인'), '창동 본사', '010-9926-3267', 0),
  ('a1000000-0000-0000-0000-000000000002', '손우림', '차장', null, (select id from partners where company_name = '강산이엔지'), '창동 본사', '010-7234-8468', 1),
  ('a1000000-0000-0000-0000-000000000002', '조경화', '차장', null, (select id from partners where company_name = '엘가디자인'), '창동 본사', '010-8974-5720', 2),
  ('a1000000-0000-0000-0000-000000000002', '이수경', '대리', null, (select id from partners where company_name = '강산이엔지'), '창동 본사', '010-9030-2742', 3),

  ('a1000000-0000-0000-0000-000000000003', '송형렬', '전무', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-3191-6433', 0),
  ('a1000000-0000-0000-0000-000000000003', '강민준', '이사', null, (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-5244-2570', 1),
  ('a1000000-0000-0000-0000-000000000003', '박영미', '부장', null, (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-9057-3549', 2),
  ('a1000000-0000-0000-0000-000000000003', '차미영', '실장', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-8586-3570', 3),
  ('a1000000-0000-0000-0000-000000000003', '이준범', '차장', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-3982-5725', 4),
  ('a1000000-0000-0000-0000-000000000003', '홍유나', '과장', '육아휴직', (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-9678-6825', 5),
  ('a1000000-0000-0000-0000-000000000003', '김수하', '대리', null, (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-4440-4055', 6),
  ('a1000000-0000-0000-0000-000000000003', '김종도', '대리', null, (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-2836-6447', 7),

  ('a1000000-0000-0000-0000-000000000004', '이수복', '전무', null, (select id from partners where company_name = '강산이엔지'), '창동 본사', '010-7641-5582', 0),
  ('a1000000-0000-0000-0000-000000000004', '백지혜', '부장', null, (select id from partners where company_name = '엘가디자인'), '창동 본사', '010-5470-1522', 1),
  ('a1000000-0000-0000-0000-000000000004', '방호정', '차장', null, (select id from partners where company_name = '엘가디자인'), '창동 본사', '010-8733-5261', 2),
  ('a1000000-0000-0000-0000-000000000004', '공병문', '사원', null, (select id from partners where company_name = '더패스트'), '창동 본사', '010-5215-3288', 3),

  ('a1000000-0000-0000-0000-000000000005', '박선미', '이사', null, (select id from partners where company_name = '엘가디자인'), '창동 엘가디자인', '010-4431-0705', 0),
  ('a1000000-0000-0000-0000-000000000005', '한승미', '과장', null, (select id from partners where company_name = '엘가디자인'), '창동 엘가디자인', '010-2370-2370', 1),
  ('a1000000-0000-0000-0000-000000000005', '문지현', '주임', null, (select id from partners where company_name = '더패스트'), '창동 엘가디자인', '010-8200-3877', 2),
  ('a1000000-0000-0000-0000-000000000005', '우영진', '주임', null, (select id from partners where company_name = '강산이엔지'), '창동 엘가디자인', '010-7177-0683', 3),
  ('a1000000-0000-0000-0000-000000000005', '김소영', '사원', '육아휴직', (select id from partners where company_name = '엘가디자인'), '창동 엘가디자인', '010-2438-2460', 4),
  ('a1000000-0000-0000-0000-000000000005', '이승민', '사원', null, (select id from partners where company_name = '엘가디자인'), '창동 엘가디자인', '010-5835-8286', 5),

  ('a1000000-0000-0000-0000-000000000006', '양창진', '상무', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-9199-0085', 0),
  ('a1000000-0000-0000-0000-000000000006', '최재호', '이사', null, (select id from partners where company_name = '더패스트'), '양주 더패스트', '010-3665-0848', 1),
  ('a1000000-0000-0000-0000-000000000006', '양진우', '주임', null, (select id from partners where company_name = '엘가디자인'), '양주 더패스트', '010-4794-0089', 2),

  ('a1000000-0000-0000-0000-000000000007', '박진', '차장', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-4137-9413', 0),
  ('a1000000-0000-0000-0000-000000000007', '김환진', '대리', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-2041-2636', 1),

  ('a1000000-0000-0000-0000-000000000008', '유준영', '대리', null, (select id from partners where company_name = '강산이엔지'), '양주 더패스트', '010-5838-0784', 0);
