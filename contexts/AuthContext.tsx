import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabaseClient, useUser, User } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null
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
      } else if (event === 'SIGNED_OUT') {
        router.push('/') // Redirect to home page on sign out
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const value = {
    user,
    isLoading,
    error
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 