-- 업로드할 때 Latin-1 로 잘못 읽혀 깨진 파일 이름(예: "íµì¥ì¬ë³¸.jpg")을 원래 한글(UTF-8)로 되돌린다.
-- 깨진 글자(0x80~0xFF 범위)가 있는 이름만 바꾸며, 한 번 실행하면 된다(다시 실행해도 이미 고친 이름은 건드리지 않음).
update partners
set bankbook_file_name = convert_from(convert_to(bankbook_file_name, 'LATIN1'), 'UTF8')
where bankbook_file_name ~ '[\u0080-ÿ]' and bankbook_file_name !~ '[^\u0001-ÿ]';

update partners
set registration_file_name = convert_from(convert_to(registration_file_name, 'LATIN1'), 'UTF8')
where registration_file_name ~ '[\u0080-ÿ]' and registration_file_name !~ '[^\u0001-ÿ]';

select company_name, registration_file_name, bankbook_file_name from partners order by sort_order;
