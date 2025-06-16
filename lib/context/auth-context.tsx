"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSupabaseClient, useUser, User } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ data: any, error: Error | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => ({ data: null, error: null }),
  signOut: async () => {},
  signInWithGoogle: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseClient()
  const user = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error checking session:', sessionError)
          setError('Failed to check authentication status')
        }

        // If no session, clear any stale data
        if (!session) {
          console.log('No active session found')
        }

      } catch (err) {
        console.error('Error in auth state check:', err)
        setError('Failed to check authentication status')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (event === 'SIGNED_IN') {
        setError(null)
        router.refresh()
      } else if (event === 'SIGNED_OUT') {
        router.push('/') // Redirect to home page on sign out
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      // Check if user already exists and is confirmed
      // Supabase returns user data even for existing users, but with identityConfirmedAt set
      if (data?.user?.identities?.length === 0 || data?.user?.confirmed_at) {
        // Create an error that matches the format expected by handleAuthError
        const existingUserError = new Error('user already registered') as AuthError
        existingUserError.status = 400
        throw existingUserError
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('Error signing up:', error)
      throw error // Propagate the error to be handled by handleAuthError
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 