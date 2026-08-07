import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F6F8",
        surface: "#FFFFFF",
        line: "#E6E8EC",
        ink: {
          DEFAULT: "#101828",
          2: "#344054",
          3: "#667085",
          4: "#98A2B3",
        },
        accent: {
          DEFAULT: "#12A67A",
          soft: "#E6F6F0",
        },
        risk: {
          high: "#D92D20",
          "high-soft": "#FEE4E2",
          medium: "#DC6803",
          "medium-soft": "#FEF0C7",
          low: "#039855",
          "low-soft": "#D1FADF",
        },
        folder: {
          amber: "#F79009",
          "amber-soft": "#FEF0C7",
          blue: "#2E90FA",
          "blue-soft": "#D1E9FF",
          green: "#12B76A",
          "green-soft": "#D1FADF",
          violet: "#7A5AF8",
          "violet-soft": "#EBE9FE",
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
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        pop: "0 4px 16px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
}

export default config
