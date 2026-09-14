import { redirect } from "next/navigation";

/**
 * 별도 홈 대시보드는 두지 않는다 — 업무관리가 사실상 기본 화면.
 * 로그인 성공 시에는 미들웨어(resolveRedirect)가 곧바로 /tasks 로 보내므로
 * 이 리다이렉트는 "/"를 직접 열거나 북마크해둔 경우를 위한 안전망이다.
 */
export default function HomePage() {
  redirect("/tasks");
}
