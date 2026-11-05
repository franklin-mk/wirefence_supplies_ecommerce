import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        primary: { DEFAULT: "hsl(var(--primary))", fg: "hsl(var(--primary-fg))" },
        accent: "hsl(var(--accent))",
        danger: "hsl(var(--danger))",
        success: "hsl(var(--success))",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      keyframes: {
        heart: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.4)" }, "100%": { transform: "scale(1)" } },
      },
      animation: { heart: "heart 0.35s ease-out" },
    },
  },
  plugins: [],
};

export default config;
