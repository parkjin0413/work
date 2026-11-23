import { formatBusinessNumber, formatPhoneNumber } from "@/lib/format/koreanNumbers";

type PartnerInfo = {
  companyName: string;
  representative: string | null;
  address: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
};

/**
 * 견적서·계약서·거래처 등록 양식에 붙여넣을 회사 정보 한 덩어리.
 * 비어 있는 칸은 뺀다. 번호는 읽기 쉽게 하이픈을 넣는다.
 */
export function buildPartnerText(p: PartnerInfo): string {
  const lines: [string, string | null][] = [
    ["상호", p.companyName],
    ["대표자", p.representative],
    ["사업자번호", p.businessNumber ? formatBusinessNumber(p.businessNumber) : null],
    ["주소", p.address],
    ["전화번호", p.phone ? formatPhoneNumber(p.phone) : null],
    ["이메일", p.email],
  ];
  const account = [p.bankName, p.accountNumber, p.accountHolder ? `예금주 ${p.accountHolder}` : null]
    .filter((v) => v && v.trim())
    .join(" ");
  if (account) lines.push(["계좌", account]);
  return lines
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `${label}: ${value!.trim()}`)
    .join("\n");
}
