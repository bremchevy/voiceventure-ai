'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { useProfile } from '@/lib/hooks/use-profile'
import { AuthForm } from '@/components/auth/auth-form'
import { Button } from '@/components/ui/button'
import { User, School, Book, GraduationCap, FileText, BarChart2, LogOut, DollarSign, Bell, Settings } from 'lucide-react'
import { EditProfile } from './edit-profile'
import { NotificationSettings } from './notification-settings'

export function ProfileView() {
  const { user, signOut } = useAuth()
  const { profile, loading, fetchProfile } = useProfile()
  const [showEditProfile, setShowEditProfile] = useState(false)

  useEffect(() => {
    if (!loading && !profile) {
      fetchProfile()
    }
  }, [loading, profile])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) {
    return (
      <div className="p-4">
        <AuthForm />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (showEditProfile) {
    return <EditProfile onBack={() => {
      setShowEditProfile(false)
      fetchProfile() // Refresh profile data when returning from edit
    }} />
  }

  const displayName = profile?.display_name || 'Unnamed Teacher'

  return (
    <div className="space-y-6 pb-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={displayName} 
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-purple-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-gray-800 font-bold">{displayName}</h3>
            <div className="grid grid-cols-1 gap-2 mt-2">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600 text-sm">{profile?.school || 'School not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600 text-sm">{profile?.grade_level || 'Grade level not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Book className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600 text-sm">{profile?.subject || 'Subject not specified'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowEditProfile(true)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-800 text-lg font-medium mb-4">Earnings Overview</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">$0.00</p>
            <p className="text-xs text-purple-600">Start selling to earn</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Total Sales</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">0</p>
            <p className="text-xs text-blue-600">Downloads this month</p>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-800 text-lg font-medium">My Resources</h2>
          <Button variant="ghost" size="sm" className="text-purple-600">
            View All
          </Button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="mb-2">No resources yet</p>
          <p className="text-sm text-gray-400 mb-4">Start creating and sharing your educational resources</p>
          <Button variant="outline" size="sm">
            Create New Resource
          </Button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-800 text-lg font-medium mb-4">Notification Settings</h2>
        <NotificationSettings />
      </div>

      {/* Logout Button */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
} 