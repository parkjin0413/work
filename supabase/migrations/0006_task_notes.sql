-- 수시 업무(general task)의 진행 메모를 시간순 로그로 쌓는다.
-- 등록 시 한 번 쓰는 tasks.memo(개요)와 별개로, 등록 이후 계속 덧붙이는 항목별 메모.
create table task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_notes_task_id_idx on task_notes(task_id, created_at);

alter table task_notes enable row level security;
-- tasks 와 동일: 서버(서비스 역할 키)에서만 접근. anon/authenticated 정책 없음 = 전면 차단.
