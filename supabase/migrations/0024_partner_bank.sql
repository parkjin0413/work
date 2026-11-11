-- 회사(거래처) 카드에 은행명·계좌번호·예금주와 통장 사본을 붙인다.
alter table partners
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists account_holder text,
  add column if not exists bankbook_file_path text,
  add column if not exists bankbook_file_name text;

-- 통장 사본은 계좌 정보가 담겨 있어 사업자등록증(공개 버킷)과 달리 비공개 버킷에 둔다.
-- 서버(서비스 역할 키)에서 1시간짜리 서명 URL 을 만들어 로그인한 화면에서만 보여준다.
insert into storage.buckets (id, name, public)
values ('partner-private', 'partner-private', false)
on conflict (id) do nothing;
