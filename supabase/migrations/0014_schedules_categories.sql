-- 분류 변경: '창동 본사' → '본사', '행사' 추가.
alter table schedules drop constraint if exists schedules_category_check;

update schedules set category = '본사' where category = '창동 본사';

alter table schedules
  add constraint schedules_category_check
  check (category in ('시장조사', '미팅', '촬영', '전시회', '행사', '연차', '본사'));
