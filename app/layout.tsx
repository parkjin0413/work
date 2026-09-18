import type { Metadata } from "next";
import "pretendard/dist/web/static/pretendard.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "개인 업무 대시보드",
  description: "즐겨찾기·계정관리·업무관리·제품정보를 한 곳에서 관리하는 개인 업무 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-bg font-sans text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
