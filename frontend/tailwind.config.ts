import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14130F",
          2: "#1C1B16",
          3: "#27251D",
        },
        parchment: "#E8DFC8",
        brass: "#B8935A",
        severity: {
          "red-p": "#8C2F2F",
          "red-i": "#C4635C",
          "amber-p": "#B8792E",
          "amber-i": "#D2A05A",
          "green-p": "#3F6B4A",
          "green-i": "#7FA588",
        },
      },
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "serif"],
        sans: ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        mono: ["'Courier New'", "Courier", "monospace"],
      },
    },
  },
  plugins: [],
}

export default config
