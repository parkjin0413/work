-- 분류에 '홍보부'(팀원 외근·일정 확인용) 추가.
alter table schedules drop constraint if exists schedules_category_check;

alter table schedules
  add constraint schedules_category_check
  check (category in ('연차', '본사', '시장조사', '미팅', '촬영', '전시회', '행사', '홍보부'));
