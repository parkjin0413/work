import { redirect } from "next/navigation";

// 계정관리·즐겨찾기는 "어카운트·북마크"(/sites) 한 화면으로 합쳤다. 옛 주소로 들어오면 그쪽으로 보낸다.
export default function LegacyPage() {
  redirect("/sites");
}
