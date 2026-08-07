import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "Litigate",
  description: "Contract risk and policy governance",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
