import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "Litigate",
  description: "Contract risk and policy governance",
}

// Runs before first paint so a dark-mode visitor never sees a white flash.
// This is a static export, so there is no server render to decide it for us.
const THEME_SCRIPT = [
  "try{",
  'var stored = localStorage.getItem("litigate-theme");',
  'if(stored !== "light" && stored !== "dark"){',
  'stored = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";',
  "}",
  'if(stored === "dark"){ document.documentElement.classList.add("dark"); }',
  "}catch(e){}",
].join("")

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-ink">{children}</body>
    </html>
  )
}
