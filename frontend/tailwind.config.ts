import type { Config } from "tailwindcss"

// Every colour resolves through a CSS variable so the palette can be swapped
// at the root element. Components never need a dark: variant.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        line: "var(--line)",
        // Solid buttons keep their own pair. Reusing ink would invert them
        // in dark mode and leave white text on a pale background.
        strong: "var(--strong)",
        onstrong: "var(--on-strong)",
        onaccent: "var(--on-accent)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        risk: {
          high: "var(--risk-high)",
          "high-soft": "var(--risk-high-soft)",
          medium: "var(--risk-medium)",
          "medium-soft": "var(--risk-medium-soft)",
          low: "var(--risk-low)",
          "low-soft": "var(--risk-low-soft)",
        },
        folder: {
          amber: "var(--folder-amber)",
          "amber-soft": "var(--folder-amber-soft)",
          blue: "var(--folder-blue)",
          "blue-soft": "var(--folder-blue-soft)",
          green: "var(--folder-green)",
          "green-soft": "var(--folder-green-soft)",
          violet: "var(--folder-violet)",
          "violet-soft": "var(--folder-violet-soft)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["'SF Mono'", "Menlo", "Consolas", "'Courier New'", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
}

export default config
