import type { Config } from "tailwindcss";

/**
 * Tailwind here is a thin utility layer. The real design system lives in
 * src/styles/console-tokens.css as CSS variables; this config only exposes
 * a handful of them as utilities for new code that doesn't reuse the
 * prototype's class names.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--c-page)",
        ink: "var(--c-text)",
        navy: "var(--navy)",
        accent: "var(--c-accent)",
        muted: "var(--c-muted)",
        border: "var(--c-border)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
