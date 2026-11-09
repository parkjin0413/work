-- 업무관리 개편: 진행 메모(task_notes)를 "날짜가 붙은 한 줄 항목"으로 확장한다.
--   work_date   : 그 일을 한(할) 날짜. 기존 메모는 작성한 날짜(KST)로 채운다.
--   status      : planned(계획) / done(완료). 기존 메모는 모두 완료.
--   task_id     : 프로젝트 연결은 선택. 프로젝트 없이 적는 항목을 허용한다.
--   schedule_id : 연간일정에서 담아온 항목이면 그 일정 (같은 일정을 두 번 담지 않게).
--   sort_order  : 같은 날 안에서의 순서.

alter table task_notes alter column task_id drop not null;

alter table task_notes add column if not exists work_date date;
update task_notes
   set work_date = (created_at at time zone 'Asia/Seoul')::date
 where work_date is null;
alter table task_notes alter column work_date set not null;
alter table task_notes alter column work_date set default ((now() at time zone 'Asia/Seoul')::date);

alter table task_notes add column if not exists status text not null default 'done';
alter table task_notes drop constraint if exists task_notes_status_check;
alter table task_notes add constraint task_notes_status_check check (status in ('planned', 'done'));

alter table task_notes add column if not exists sort_order integer not null default 0;

alter table task_notes add column if not exists schedule_id uuid references schedules(id) on delete set null;

create index if not exists task_notes_work_date_idx on task_notes(work_date, sort_order);
