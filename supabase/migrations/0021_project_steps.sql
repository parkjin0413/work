-- 업무관리 2단계: 프로젝트 = "남은 단계(날짜 없는 항목) + 진행 기록".
--   task_notes.work_date 가 비어 있으면 아직 날짜를 정하지 않은 "단계"(할 일 보관함)다.
--   tasks.kind : project(끝이 있는 일) / ongoing(상시 업무, 완료·정체 표시 없음)

alter table task_notes alter column work_date drop not null;

alter table tasks add column if not exists kind text not null default 'project';
alter table tasks drop constraint if exists tasks_kind_check;
alter table tasks add constraint tasks_kind_check check (kind in ('project', 'ongoing'));
