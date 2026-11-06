import { redirect } from "next/navigation";

// 회사정보·직원명단은 "회사 · 직원"(/company) 한 화면으로 합쳤다. 옛 주소로 들어오면 그쪽으로 보낸다.
export default function LegacyPage() {
  redirect("/company");
}
