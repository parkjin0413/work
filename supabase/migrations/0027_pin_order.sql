-- 어카운트 "고정" 영역의 순서. 계정·즐겨찾기가 한 줄에 섞이므로 두 표에 같은 이름의 열을 둔다.
-- 열을 더하기만 한다. 비어 있으면(null) 고정한 순서대로 뒤에 붙는다.

alter table accounts add column if not exists pin_order integer;
alter table favorites add column if not exists pin_order integer;

select
  (select count(*) from accounts where pinned) as pinned_accounts,
  (select count(*) from favorites where pinned) as pinned_favorites;
