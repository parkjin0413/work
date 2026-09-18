-- 실제 직원명부(내선/생일 포함 문서) 기준으로 생일 정보를 채운다.
-- 이름으로 매칭 (29명 전원 이름이 유일함, 연락처로 대조 확인함).
update employees e set
  birthday_month = v.month,
  birthday_day = v.day,
  birthday_calendar = v.calendar
from (values
  ('장준호', 9, 4, 'lunar'),
  ('조은아', 5, 24, 'lunar'),
  ('손우림', 10, 24, 'solar'),
  ('조경화', 8, 28, 'solar'),
  ('이수경', 11, 29, 'solar'),
  ('이수복', 11, 12, 'lunar'),
  ('백지혜', 5, 22, 'solar'),
  ('방호정', 6, 25, 'solar'),
  ('공병문', 1, 18, 'solar'),
  ('박선미', 3, 14, 'solar'),
  ('한승미', 3, 13, 'solar'),
  ('문지현', 9, 24, 'solar'),
  ('우영진', 6, 23, 'solar'),
  ('김소영', 3, 5, 'solar'),
  ('이승민', 3, 2, 'solar'),
  ('송형렬', 2, 9, 'lunar'),
  ('강민준', 4, 17, 'lunar'),
  ('박영미', 9, 14, 'solar'),
  ('차미영', 10, 3, 'solar'),
  ('이준범', 11, 8, 'solar'),
  ('홍유나', 8, 13, 'solar'),
  ('김종도', 6, 6, 'solar'),
  ('김수하', 8, 30, 'solar'),
  ('양창진', 11, 25, 'lunar'),
  ('최재호', 5, 20, 'solar'),
  ('양진우', 10, 19, 'solar'),
  ('박진', 4, 13, 'solar'),
  ('김환진', 2, 19, 'solar'),
  ('유준영', 11, 30, 'solar')
) as v(name, month, day, calendar)
where e.name = v.name;
