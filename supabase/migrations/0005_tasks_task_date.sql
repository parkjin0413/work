-- 일반 업무에 사용자가 직접 지정하는 날짜(예: 업무를 받은 날짜)를 저장한다.
-- created_at(생성 감사용 타임스탬프)과 별개로, 화면에 보여주고 수정 가능한 날짜.
alter table tasks add column task_date date;
