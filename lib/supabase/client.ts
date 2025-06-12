'use client'

import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type TeacherProfile = {
  id: string
  user_id: string
  full_name: string
  subjects: string[]
  grade_levels: string[]
  created_at: string
  updated_at: string
} 