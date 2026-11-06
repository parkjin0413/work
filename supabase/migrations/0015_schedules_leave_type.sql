-- 연차 일정의 종류: 종일(full) / 오전 반차(am) / 오후 반차(pm). 연차가 아닌 일정은 null.
alter table schedules
  add column if not exists leave_type text check (leave_type in ('full', 'am', 'pm'));

update schedules set leave_type = 'full' where category = '연차' and leave_type is null;
