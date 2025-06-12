'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import { validateProfile } from '@/lib/validations/profile'
import { createError, ErrorCodes, handleError } from '@/lib/utils/errors'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  school: string | null
  subject: string | null
  grade_level: string | null
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Hook for managing user profile data
 * @returns {Object} Profile management methods and state
 * @property {Profile | null} profile - The current user's profile data
 * @property {boolean} loading - Whether the profile is currently loading
 * @property {Function} updateProfile - Function to update the profile
 * @property {Function} fetchProfile - Function to fetch the latest profile data
 */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  /**
   * Creates a new profile for the current user
   * @returns {Promise<Profile | null>} The newly created profile or null if creation failed
   * @throws {AppError} If profile creation fails
   */
  const createProfile = async () => {
    if (!user) return null

    const newProfile = {
      id: user.id,
      display_name: null,
      avatar_url: null,
      school: null,
      subject: null,
      grade_level: null,
      preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (error) {
        throw createError(ErrorCodes.PROFILE_CREATE_FAILED, error)
      }

      return data
    } catch (error) {
      throw createError(ErrorCodes.PROFILE_CREATE_FAILED, error)
    }
  }

  /**
   * Fetches the current user's profile
   * @throws {AppError} If profile fetch fails
   */
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw createError(ErrorCodes.PROFILE_NOT_FOUND, error)
      }

      if (!data) {
        const newProfile = await createProfile()
        if (newProfile) {
          setProfile(newProfile)
        }
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error in fetchProfile:', handleError(error))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Updates the current user's profile
   * @param {Partial<Profile>} updates - The profile fields to update
   * @returns {Promise<{ error: Error | null }>} Result of the update operation
   * @throws {AppError} If validation fails or update fails
   */
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: createError(ErrorCodes.AUTH_NOT_AUTHENTICATED) }
    }

    // Validate the updates
    const validation = validateProfile(updates)
    if (!validation.success) {
      console.error('Profile validation failed:', validation.error)
      return { error: createError(ErrorCodes.PROFILE_INVALID_DATA, validation.error) }
    }

    try {
      setLoading(true)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          ...validation.data, // Use the validated data
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        return { error: createError(ErrorCodes.PROFILE_UPDATE_FAILED, updateError) }
      }

      if (data) {
        setProfile(data)
      }
      
      return { error: null }
    } catch (error) {
      return { error: handleError(error) }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Updates user preferences
   * @param {Record<string, any>} preferences - The preferences to update
   * @returns {Promise<{ error: Error | null }>} Result of the update operation
   */
  const updatePreferences = async (preferences: Record<string, any>) => {
    if (!user || !profile) {
      throw createError(ErrorCodes.AUTH_NOT_AUTHENTICATED)
    }

    try {
      setLoading(true)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          preferences: {
            ...profile.preferences,
            ...preferences
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw createError(ErrorCodes.PROFILE_UPDATE_FAILED, updateError)
      }

      if (data) {
        setProfile(data)
      }
      
      return { error: null }
    } catch (error) {
      return { error: handleError(error) }
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new as Profile)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProfile()
  }, [user?.id])

  return {
    profile,
    loading,
    updateProfile,
    updatePreferences,
    fetchProfile,
  }
} 