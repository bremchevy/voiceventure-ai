import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeacherProfile } from '@/lib/supabase/client'

export function useTeacherProfile() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) {
          setLoading(false)
          return
        }

        // Get teacher profile
        const { data, error: profileError } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profileError) throw profileError
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return { profile, loading, error }
} 