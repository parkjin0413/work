-- 홍보부 일정의 담당 직원. 직원이 삭제되면 일정은 남기고 담당만 비운다.
alter table schedules
  add column if not exists employee_id uuid references employees(id) on delete set null;
