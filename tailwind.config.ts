import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
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
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
