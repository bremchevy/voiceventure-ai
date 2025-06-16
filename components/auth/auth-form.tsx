'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { AuthError, AuthApiError } from '@supabase/supabase-js'

interface AuthFormError {
  type: 'email' | 'password' | 'general'
  message: string
}

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [error, setError] = useState<AuthFormError | null>(null)
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const validateForm = (): boolean => {
    // Reset previous errors
    setError(null)

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError({
        type: 'email',
        message: 'Please enter a valid email address'
      })
      return false
    }

    // Password validation
    if (isSignUp && password.length < 6) {
      setError({
        type: 'password',
        message: 'Password must be at least 6 characters long'
      })
      return false
    }

    return true
  }

  const handleAuthError = (error: AuthError) => {
    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = (error as AuthApiError)?.status || 0
    
    // Handle specific error codes
    if (errorCode === 400 && errorMessage.includes('user already registered')) {
      setError({
        type: 'email',
        message: 'This email is already registered. Please sign in instead.'
      })
      setIsSignUp(false)
    } else if (errorMessage.includes('user already registered')) {
      setError({
        type: 'email',
        message: 'This email is already registered. Please sign in instead.'
      })
      setIsSignUp(false)
    } else if (errorCode === 422 && errorMessage.includes('email exists')) {
      setError({
        type: 'email',
        message: 'An account with this email already exists. Please sign in instead.'
      })
      setIsSignUp(false)
    } else if (errorCode === 400 && errorMessage.includes('invalid login credentials')) {
      setError({
        type: 'general',
        message: 'Invalid email or password. Please try again.'
      })
    } else if (errorCode === 429) {
      setError({
        type: 'general',
        message: 'Too many attempts. Please try again later.'
      })
    } else if (errorMessage.includes('weak password')) {
      setError({
        type: 'password',
        message: 'Password is too weak. It should be at least 6 characters long and include numbers or special characters.'
      })
    } else if (errorMessage.includes('email not confirmed')) {
      setError({
        type: 'email',
        message: 'Please verify your email address before signing in.'
      })
    } else {
      setError({
        type: 'general',
        message: 'An error occurred. Please try again.'
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset states
    setError(null)
    setSignupSuccess(false)

    // Validate form
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        // Only show success if we get here (no error thrown)
        setSignupSuccess(true)
        // Clear form
        setEmail('')
        setPassword('')
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setSignupSuccess(false) // Ensure success message is hidden on error
      handleAuthError(error as AuthError)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
    } catch (error) {
      console.error('Google sign in error:', error)
      setError({
        type: 'general',
        message: 'Failed to sign in with Google. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const renderErrorMessage = () => {
    if (!error) return null

    return (
      <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
        <AlertCircle className="w-4 h-4" />
        <span>{error.message}</span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isSignUp
            ? 'Start your journey with VoiceVenture AI'
            : 'Sign in to continue with VoiceVenture AI'}
        </p>
        {signupSuccess && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
            <p>Account created successfully! Please check your email to verify your account.</p>
          </div>
        )}
        {error?.type === 'general' && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error.message}</p>
          </div>
        )}
      </div>

      {/* Google Sign In Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 py-6"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="Email address"
              required
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all ${
                error?.type === 'email'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
          </div>
          {error?.type === 'email' && renderErrorMessage()}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              placeholder="Password"
              required
              className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all ${
                error?.type === 'password'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error?.type === 'password' && renderErrorMessage()}
          {isSignUp && !error?.type && (
            <p className="text-sm text-gray-500 mt-2">
              Password must be at least 6 characters long
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            isSignUp ? 'Create Account' : 'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
            setSignupSuccess(false)
          }}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
} 