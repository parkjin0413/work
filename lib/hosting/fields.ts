// 호스팅 메뉴의 입력 항목 정의. 폼·카드·저장 로직이 모두 이 목록을 기준으로 동작한다.
// 클라이언트에서도 import 하므로 서버 전용 코드(암호화 등)는 두지 않는다.

export type FieldType = "text" | "url" | "date" | "password" | "textarea" | "ssl";

export type FieldDef = {
  key: string;
  column: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

export type SectionDef = {
  title: string;
  fields: FieldDef[];
};

export const HOSTING_SECTIONS: SectionDef[] = [
  {
    title: "기본 정보",
    fields: [
      { key: "siteName", column: "site_name", label: "홈페이지 이름", type: "text", placeholder: "예: 강산이엔지 공식 홈페이지" },
      { key: "siteUrl", column: "site_url", label: "홈페이지 주소", type: "url", placeholder: "https://" },
    ],
  },
  {
    title: "호스팅",
    fields: [
      { key: "hostingProvider", column: "hosting_provider", label: "호스팅사", type: "text", placeholder: "예: 카페24, 가비아" },
      { key: "hostingProduct", column: "hosting_product", label: "상품명", type: "text", placeholder: "예: 10G 광아우토반" },
      { key: "hostingStartDate", column: "hosting_start_date", label: "시작일", type: "date" },
      { key: "hostingEndDate", column: "hosting_end_date", label: "종료일", type: "date" },
      { key: "hostingCost", column: "hosting_cost", label: "비용", type: "text", placeholder: "예: 연 132,000원" },
      { key: "hostingConsoleUrl", column: "hosting_console_url", label: "호스팅 관리페이지", type: "url", placeholder: "https://" },
      { key: "hostingUsername", column: "hosting_username", label: "호스팅 아이디", type: "text" },
      { key: "hostingPassword", column: "hosting_password_encrypted", label: "호스팅 비밀번호", type: "password" },
    ],
  },
  {
    title: "도메인 · SSL",
    fields: [
      { key: "primaryDomain", column: "primary_domain", label: "기본 도메인", type: "text", placeholder: "예: example.co.kr" },
      { key: "domainRegistrar", column: "domain_registrar", label: "도메인 등록업체", type: "text", placeholder: "예: 카페24" },
      { key: "domainEndDate", column: "domain_end_date", label: "도메인 만료일", type: "date" },
      { key: "connectedDomains", column: "connected_domains", label: "추가 연결 도메인", type: "textarea", placeholder: "한 줄에 하나씩" },
      { key: "sslEnabled", column: "ssl_enabled", label: "SSL 적용", type: "ssl" },
      { key: "sslProvider", column: "ssl_provider", label: "인증서 발급처", type: "text", placeholder: "예: Let's Encrypt (무료)" },
      { key: "sslEndDate", column: "ssl_end_date", label: "SSL 만료일", type: "date" },
    ],
  },
  {
    title: "관리자 페이지",
    fields: [
      { key: "adminUrl", column: "admin_url", label: "관리자 주소", type: "url", placeholder: "https://" },
      { key: "adminUsername", column: "admin_username", label: "관리자 아이디", type: "text" },
      { key: "adminPassword", column: "admin_password_encrypted", label: "관리자 비밀번호", type: "password" },
    ],
  },
  {
    title: "FTP",
    fields: [
      { key: "ftpHost", column: "ftp_host", label: "FTP 주소", type: "text", placeholder: "예: ftp.example.co.kr" },
      { key: "ftpPort", column: "ftp_port", label: "포트", type: "text", placeholder: "예: 21" },
      { key: "ftpUsername", column: "ftp_username", label: "FTP 아이디", type: "text" },
      { key: "ftpPassword", column: "ftp_password_encrypted", label: "FTP 비밀번호", type: "password" },
    ],
  },
  {
    title: "데이터베이스",
    fields: [
      { key: "dbHost", column: "db_host", label: "DB 주소", type: "text", placeholder: "예: localhost" },
      { key: "dbUsername", column: "db_username", label: "DB 아이디", type: "text" },
    ],
  },
  {
    title: "메모",
    fields: [{ key: "memo", column: "memo", label: "메모", type: "textarea", placeholder: "갱신 담당자, 유지보수 업체 연락처 등" }],
  },
];

export const ALL_FIELDS: FieldDef[] = HOSTING_SECTIONS.flatMap((section) => section.fields);

/** 모든 값은 문자열로 다룬다. 빈 문자열 = 값 없음. SSL은 "yes" / "no" / "". */
export type HostingValues = Record<string, string>;

export type HostingSite = {
  id: string;
  values: HostingValues;
};

export function emptyHostingValues(): HostingValues {
  return Object.fromEntries(ALL_FIELDS.map((field) => [field.key, ""]));
}

export const EXPIRY_FIELDS = [
  { key: "hostingEndDate", label: "호스팅" },
  { key: "domainEndDate", label: "도메인" },
  { key: "sslEndDate", label: "SSL" },
] as const;

/** 이 일수 이하로 남으면 "임박"으로 표시한다. */
export const EXPIRY_WARNING_DAYS = 30;
