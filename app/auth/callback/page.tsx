'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // If we have a code parameter, the route handler will handle the exchange
    const code = searchParams.get('code')
    
    if (code) {
      // The route handler will automatically handle the code exchange
      // and set up the session. We just need to redirect to home
      // after a short delay to allow the session to be set up
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      // If no code, redirect to home
      router.push('/')
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
} 