import type { Metadata } from "next";
import "pretendard/dist/web/static/pretendard.css";
import "./globals.css";
import { ROOT_FONT_SIZE_SCRIPT } from "@/lib/ui/rootFontSize";

export const metadata: Metadata = {
  title: "강산이엔지 업무 대시보드",
  description: "즐겨찾기·계정관리·업무관리·제품정보를 한 곳에서 관리하는 강산이엔지 업무 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 모니터에 맞춰 기준 글자 크기를 정하는 스크립트가 html 에 style 을 넣으므로 hydration 경고를 끈다.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ROOT_FONT_SIZE_SCRIPT }} />
      </head>
      <body className="bg-bg font-sans text-foreground">{children}</body>
    </html>
  );
}
