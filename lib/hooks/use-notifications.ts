'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/auth-context'
import { validateNotificationSettings } from '@/lib/validations/profile'
import { createError, ErrorCodes, handleError } from '@/lib/utils/errors'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface NotificationSettings {
  id: string
  user_id: string
  email_notifications: boolean
  sales_updates: boolean
  resource_comments: boolean
  marketing_emails: boolean
  created_at: string
  updated_at: string
}

/**
 * Hook for managing user notification settings
 * @returns {Object} Notification settings management methods and state
 * @property {NotificationSettings | null} settings - The current user's notification settings
 * @property {boolean} loading - Whether the settings are currently loading
 * @property {Function} updateSettings - Function to update the settings
 */
export function useNotifications() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Memoize the settings update callback
  const handleSettingsChange = useCallback((payload: any) => {
    if (payload.new) {
      setSettings(payload.new as NotificationSettings)
    }
  }, [])

  /**
   * Fetches the current user's notification settings
   * @throws {AppError} If settings fetch fails
   */
  const fetchSettings = async () => {
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }

    try {
      // First try to fetch existing settings
      let { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // If there's a real error (not just no data)
      if (error && error.code !== 'PGRST116') {
        throw createError(ErrorCodes.NOTIFICATION_NOT_FOUND, error)
      }

      // If no settings exist, create default settings
      if (!data) {
        const defaultSettings = {
          user_id: user.id,
          email_notifications: true,
          sales_updates: true,
          resource_comments: true,
          marketing_emails: true
        }

        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert([defaultSettings])
          .select()
          .single()

        if (createError) {
          throw createError(ErrorCodes.NOTIFICATION_CREATE_FAILED, createError)
        }

        if (!newSettings) {
          throw createError(ErrorCodes.NOTIFICATION_CREATE_FAILED)
        }

        data = newSettings
      }

      setSettings(data)
    } catch (error) {
      console.error('Error in fetchSettings:', handleError(error))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Updates the user's notification settings
   * @param {Partial<NotificationSettings>} updates - The settings to update
   * @returns {Promise<{ error: Error | null }>} Result of the update operation
   * @throws {AppError} If validation fails or update fails
   */
  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user) {
      throw createError(ErrorCodes.AUTH_NOT_AUTHENTICATED)
    }

    // Validate the updates
    const validation = validateNotificationSettings(updates)
    if (!validation.success) {
      throw createError(ErrorCodes.INVALID_INPUT, validation.error)
    }

    try {
      setLoading(true)

      const { data, error: updateError } = await supabase
        .from('notification_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        throw createError(ErrorCodes.NOTIFICATION_UPDATE_FAILED, updateError)
      }

      if (data) {
        setSettings(data)
      }
      
      return { error: null }
    } catch (error) {
      return { error: handleError(error) }
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription for settings updates
  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds

    const setupRealtimeSubscription = async () => {
      if (!user || !isMounted) return

      // Clean up existing subscription if any
      if (channelRef.current) {
        try {
          await channelRef.current.unsubscribe()
          await supabase.removeChannel(channelRef.current)
        } catch (error) {
          console.error('Error cleaning up channel:', error)
        }
        channelRef.current = null
      }

      try {
        const channel = supabase
          .channel(`notification_settings:${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notification_settings',
              filter: `user_id=eq.${user.id}`,
            },
            handleSettingsChange
          )
          .on('system', (event) => {
            if (event === 'disconnected' && isMounted && retryCount < MAX_RETRIES) {
              setTimeout(() => {
                retryCount++
                setupRealtimeSubscription()
              }, RETRY_DELAY * retryCount)
            }
          })

        channelRef.current = channel

        const status = await channel.subscribe()
        if (status === 'SUBSCRIBED' && isMounted) {
          console.log(`Subscribed to notification settings for user ${user.id}`)
          retryCount = 0 // Reset retry count on successful subscription
        }
      } catch (error) {
        console.error('Error setting up notification settings subscription:', error)
        if (isMounted && retryCount < MAX_RETRIES) {
          setTimeout(() => {
            retryCount++
            setupRealtimeSubscription()
          }, RETRY_DELAY * retryCount)
        }
      }
    }

    setupRealtimeSubscription()

    return () => {
      isMounted = false
      const cleanup = async () => {
        if (channelRef.current) {
          try {
            await channelRef.current.unsubscribe()
            await supabase.removeChannel(channelRef.current)
            channelRef.current = null
          } catch (error) {
            console.error('Error cleaning up subscription:', error)
          }
        }
      }
      cleanup()
    }
  }, [user?.id, handleSettingsChange])

  // Fetch settings when user changes
  useEffect(() => {
    fetchSettings()
  }, [user?.id])

  return {
    settings,
    loading,
    updateSettings
  }
} 