import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/lib/context/auth-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "VoiceVenture AI",
  description: "AI-powered educational content creation",
  generator: "Next.js",
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
