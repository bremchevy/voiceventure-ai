'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  
  useEffect(() => {
    const supabase = createClient()
    
    // Get the session from URL or local storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If we have a session, redirect to the main page
      if (session) {
        router.push('/')
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
} 