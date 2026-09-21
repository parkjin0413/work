-- materializeWeek()의 "이번 주에 이미 생성됐는지 확인 → 없으면 생성"이 원자적이지 않아,
-- 같은 주에 짧은 간격으로 여러 요청(반복 새로고침 등)이 겹치면 각 요청이 서로의 삽입을
-- 보지 못하고 같은 고정 업무 인스턴스를 중복 생성하는 경쟁 조건이 있었다
-- (2026-09-21 발견 — "홍보부 회의" 고정 업무가 같은 주에 19개로 중복).
-- 유니크 인덱스로 DB 레벨에서 막는다. tasksStore.ts의 materializeWeek()도 이 제약 위반
-- (unique_violation, 23505)을 에러 대신 무시하도록 함께 수정했다.
drop index if exists tasks_template_id_week_start_idx;

create unique index tasks_template_id_week_start_unique_idx
  on tasks(template_id, week_start)
  where template_id is not null;
