import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  // lib/ 에도 색상 클래스(예: lib/schedule/categories.ts)가 있어서 함께 스캔한다.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",
        "surface-highlight": "var(--color-surface-highlight)",
        "surface-highlight-soft": "var(--color-surface-highlight-soft)",
        "highlight-line": "var(--color-highlight-line)",
        "highlight-foreground": "var(--color-highlight-foreground)",
        "highlight-muted": "var(--color-highlight-muted)",
        border: "var(--color-border)",
        foreground: "var(--color-text)",
        muted: "var(--color-text-muted)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-foreground": "var(--color-accent-foreground)",
        danger: "var(--color-danger)",
        "danger-bg": "var(--color-danger-bg)",
        success: "var(--color-success)",
        "success-bg": "var(--color-success-bg)",
      },
      // 업무 화면 글자 위계. 24인치 FHD(기준 글씨 18px) 에 맞춘 값이고, 큰 모니터에서는 기준 글씨가 커지며
      // 같은 비율로 커진다(lib/ui/rootFontSize). 괄호는 FHD / 27인치 4K(150%, 20px) 에서의 크기.
      fontSize: {
        "ui-title": "0.9rem", // 16.2 / 18px 소제목: 이번 주/다음 주, 프로젝트 이름, 보고서 제목
        "ui-head": "0.8rem", // 14.4 / 16px 카드 머리: 요일, 프로젝트 목록 이름, 단계 묶음 제목
        "ui-body": "0.76rem", // 13.7 / 15.2px 본문: 업무 항목, 단계, 입력칸, 안내 문구
        "ui-meta": "0.68rem", // 12.2 / 13.6px 보조: 건수, 프로젝트 태그, 일정 칩, 작은 버튼, 날짜
        "ui-tiny": "0.6rem", // 10.8 / 12px 배지: 오늘, 숫자 표시
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
