'use client'

import { useState } from 'react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Bell } from 'lucide-react'

export function NotificationSettings() {
  const { settings, loading, updateSettings } = useNotifications()
  const [showSettings, setShowSettings] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!settings) {
    return null
  }

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    await updateSettings({ [key]: value })
  }

  if (!showSettings) {
    return (
      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-left justify-start"
          onClick={() => setShowSettings(true)}
        >
          <Bell className="w-4 h-4 mr-2" />
          Email Notifications
          {settings.email_notifications ? (
            <span className="ml-auto text-xs text-green-600">On</span>
          ) : (
            <span className="ml-auto text-xs text-gray-400">Off</span>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Email Notifications</h3>
        <Switch
          checked={settings.email_notifications}
          onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sales Updates</p>
            <p className="text-xs text-gray-500">Get notified when you make a sale</p>
          </div>
          <Switch
            checked={settings.sales_updates}
            onCheckedChange={(checked) => handleToggle('sales_updates', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Resource Comments</p>
            <p className="text-xs text-gray-500">Get notified when someone comments on your resources</p>
          </div>
          <Switch
            checked={settings.resource_comments}
            onCheckedChange={(checked) => handleToggle('resource_comments', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Marketing Emails</p>
            <p className="text-xs text-gray-500">Receive updates about new features and promotions</p>
          </div>
          <Switch
            checked={settings.marketing_emails}
            onCheckedChange={(checked) => handleToggle('marketing_emails', checked)}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowSettings(false)}
      >
        Done
      </Button>
    </div>
  )
} 