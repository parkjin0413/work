import type { Metadata } from "next";
import "pretendard/dist/web/static/pretendard.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "강산이엔지 업무 대시보드",
  description: "즐겨찾기·계정관리·업무관리·제품정보를 한 곳에서 관리하는 강산이엔지 업무 대시보드",
};

// 다크 모드: 화면이 그려지기 전에 <html> 에 dark 를 붙여, 밝은 화면이 잠깐 번쩍이지 않게 한다.
// 값은 상단 메뉴의 테마 버튼이 localStorage("theme") 에 남긴다.
const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg font-sans text-foreground">{children}</body>
    </html>
  );
}
