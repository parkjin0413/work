-- 어카운트 메뉴: 자주 쓰는 계정·즐겨찾기 고정, 계정 비밀번호를 바꾼 날짜.
-- 열을 더하기만 하므로 기존 데이터는 그대로다. 실행 전에도 화면은 예전처럼 동작한다(고정·변경일만 빠짐).

alter table accounts add column if not exists pinned boolean not null default false;
alter table accounts add column if not exists password_changed_at date;
alter table favorites add column if not exists pinned boolean not null default false;

select
  (select count(*) from accounts) as accounts,
  (select count(*) from favorites) as favorites;
