"use client"

import React from "react"
import { AuthProvider } from "@/lib/context/auth-context"
import "./globals.css"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClientComponentClient()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionContextProvider>
      </body>
    </html>
  )
}
