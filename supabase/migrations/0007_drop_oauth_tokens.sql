-- Gmail/Drive 연동을 완전히 제거하면서(2026-09) 더 이상 쓰이지 않는
-- oauth_tokens 테이블을 정리한다. 계정관리(accounts)는 별도 컬럼에 자체
-- 암호화 값을 저장하므로 영향 없음.
drop table if exists oauth_tokens;
