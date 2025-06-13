'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/supabase'

export const createClient = () => {
  return createClientComponentClient<Database>()
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