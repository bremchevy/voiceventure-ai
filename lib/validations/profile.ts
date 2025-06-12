import { z } from 'zod'

export const profileSchema = z.object({
  display_name: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .nullish(),
  school: z.string()
    .max(100, 'School name must be less than 100 characters')
    .nullish(),
  grade_level: z.string()
    .max(20, 'Grade level must be less than 20 characters')
    .nullish(),
  subject: z.string()
    .max(100, 'Subject must be less than 100 characters')
    .nullish(),
  avatar_url: z.string().url().nullish(),
  preferences: z.record(z.any()).optional(),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional()
}).partial()

export const notificationSchema = z.object({
  email_notifications: z.boolean(),
  sales_updates: z.boolean(),
  resource_comments: z.boolean(),
  marketing_emails: z.boolean(),
}).partial()

export type ProfileFormData = z.infer<typeof profileSchema>
export type NotificationFormData = z.infer<typeof notificationSchema>

export const validateProfile = (data: unknown) => {
  try {
    return profileSchema.safeParse(data)
  } catch (error) {
    console.error('Profile validation error:', error)
    return { success: false, error }
  }
}

export const validateNotificationSettings = (data: unknown) => {
  try {
    return notificationSchema.safeParse(data)
  } catch (error) {
    console.error('Notification settings validation error:', error)
    return { success: false, error }
  }
} 