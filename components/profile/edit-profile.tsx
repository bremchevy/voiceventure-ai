'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/lib/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft } from 'lucide-react'

interface EditProfileProps {
  onBack: () => void
}

export function EditProfile({ onBack }: EditProfileProps) {
  const { profile, updateProfile, loading } = useProfile()
  const [formData, setFormData] = useState({
    display_name: '',
    school: '',
    subject: '',
    grade_level: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        school: profile.school || '',
        subject: profile.subject || '',
        grade_level: profile.grade_level || '',
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Filter out empty strings
      const updates = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== '')
      )

      console.log('Submitting profile updates:', updates)
      const { error } = await updateProfile(updates)

      if (error) {
        console.error('Error updating profile:', error)
        return
      }

      onBack()
    } catch (error) {
      console.error('Error in form submission:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-medium">Edit Profile</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Display Name</label>
          <Input
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">School</label>
          <Input
            name="school"
            value={formData.school}
            onChange={handleChange}
            placeholder="Your school"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Subject</label>
          <Input
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Subject you teach"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Grade Level</label>
          <Input
            name="grade_level"
            value={formData.grade_level}
            onChange={handleChange}
            placeholder="Grade level you teach"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
} 