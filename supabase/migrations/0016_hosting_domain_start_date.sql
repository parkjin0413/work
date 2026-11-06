-- 도메인 계약 시작일 추가 (종료일은 기존 domain_end_date).
alter table hosting_sites add column if not exists domain_start_date date;
