'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardHeader } from '@/components/dashboard/header'
import {
  Mail,
  Phone,
  MapPin,
  Building,
  Camera,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Globe,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

const timezones = [
  { value: 'UTC', label: 'UTC - Coordinated Universal Time' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
]

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const user = session?.user

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    company: '',
    jobTitle: '',
    website: '',
    linkedIn: '',
    twitter: '',
    timezone: 'UTC',
    language: 'en',
    avatar: '',
  })

  const [profileData, setProfileData] = useState([])

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return

      try {
        setIsDataLoading(true)
        const response = await fetch(`/api/users/${user.id}`)

        if (response.ok) {
          const result = await response.json()
          const userData = result.data.user

          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            bio: userData.bio || '',
            location: userData.location || '',
            company: userData.company || '',
            jobTitle: userData.jobTitle || '',
            website: userData.website || '',
            linkedIn: userData.linkedIn || '',
            twitter: userData.twitter || '',
            timezone: userData.timezone || 'UTC',
            language: userData.language || 'en',
            avatar: userData.avatar || '',
          })

          // Handle profileData as JSONB
          if (userData.profileData && Array.isArray(userData.profileData)) {
            setProfileData(userData.profileData)
          } else {
            setProfileData([])
          }
        } else {
          toast.error('Failed to load profile data')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile data')
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchUserProfile()
  }, [user?.id])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const saveProfile = async (updatedData = {}) => {
    if (!user?.id) return false

    try {
      const submitData = {
        ...formData,
        ...updatedData,
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        await updateSession()
        return true
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update profile')
        return false
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('An unexpected error occurred')
      return false
    }
  }

  const handleAvatarUpload = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsAvatarUploading(true)

    try {
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: 'avatars',
        }),
      })

      if (!presignedResponse.ok) {
        throw new Error(`Failed to get upload URL: ${presignedResponse.status}`)
      }

      const presignedData = await presignedResponse.json()

      if (!presignedData.success || !presignedData.data) {
        throw new Error('Invalid response from upload service')
      }

      const uploadUrl =
        presignedData.data.uploadUrl ||
        presignedData.data.url ||
        presignedData.data.signedUrl ||
        presignedData.data.presignedUrl

      const fileUrl =
        presignedData.data.fileUrl ||
        presignedData.data.downloadUrl ||
        presignedData.data.publicUrl ||
        presignedData.data.accessUrl ||
        presignedData.data.key

      if (!uploadUrl) {
        throw new Error('Upload URL not found in response')
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image: ${uploadResponse.status}`)
      }

      let finalFileUrl = fileUrl

      if (!finalFileUrl) {
        if (uploadUrl.includes('?')) {
          finalFileUrl = uploadUrl.split('?')[0]
        } else if (presignedData.data.key) {
          finalFileUrl = `https://your-bucket-name.s3.amazonaws.com/${presignedData.data.key}`
        } else {
          finalFileUrl = uploadUrl.split('?')[0]
        }
      }

      // Update form data and auto-save
      setFormData(prev => ({
        ...prev,
        avatar: finalFileUrl,
      }))

      // Auto-save the profile with new avatar
      const saved = await saveProfile({ avatar: finalFileUrl })
      if (saved) {
        toast.success('Avatar uploaded and saved successfully!')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(error.message || 'Failed to upload avatar')
    } finally {
      setIsAvatarUploading(false)

      const fileInput = document.getElementById('avatar-upload')
      if (fileInput) {
        fileInput.value = ''
      }
    }
  }

  const handlePasswordChange = e => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!user?.id) return

    setIsLoading(true)

    try {
      const saved = await saveProfile()
      if (saved) {
        toast.success('Profile updated successfully!')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    if (!user?.id) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    setIsPasswordLoading(true)

    try {
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        toast.success('Password updated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update password')
      }
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsPasswordLoading(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-snow-100">
        <DashboardHeader
          title="Profile Settings"
          description="Manage your account information and preferences"
        />
        <main className="p-6 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <DashboardHeader
        title="Profile Settings"
        description="Manage your account information and preferences"
      />

      {/* Sticky Save Button */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-4xl flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading} className="starboard-button">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <main className="p-6 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="starboard-card">
              <CardHeader className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {getInitials(`${formData.firstName} ${formData.lastName}`)}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                      disabled={isAvatarUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full w-8 h-8 p-0"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isAvatarUploading}
                    >
                      {isAvatarUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Camera size={14} />
                      )}
                    </Button>
                  </div>
                </div>
                <CardTitle>
                  {formData.firstName} {formData.lastName}
                </CardTitle>
                <CardDescription>{formData.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-slate-gray-600">
                    <Mail size={16} className="mr-2" />
                    {formData.email}
                  </div>
                  {formData.phone && (
                    <div className="flex items-center text-slate-gray-600">
                      <Phone size={16} className="mr-2" />
                      {formData.phone}
                    </div>
                  )}
                  {formData.location && (
                    <div className="flex items-center text-slate-gray-600">
                      <MapPin size={16} className="mr-2" />
                      {formData.location}
                    </div>
                  )}
                  {formData.company && (
                    <div className="flex items-center text-slate-gray-600">
                      <Building size={16} className="mr-2" />
                      {formData.company}
                    </div>
                  )}
                  {formData.website && (
                    <div className="flex items-center text-slate-gray-600">
                      <Globe size={16} className="mr-2" />
                      <a
                        href={formData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        {formData.website}
                      </a>
                    </div>
                  )}
                  {profileData && profileData.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-gray-200">
                      {profileData.slice(0, 3).map(
                        (field, index) =>
                          field.label &&
                          field.value && (
                            <div key={index} className="flex items-center text-slate-gray-600 mb-1">
                              <span className="text-xs font-medium mr-2">{field.label}:</span>
                              <span className="text-xs truncate">{field.value}</span>
                            </div>
                          )
                      )}
                      {profileData.length > 3 && (
                        <div className="text-xs text-slate-gray-400 mt-1">
                          +{profileData.length - 3} more fields
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="starboard-input"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="starboard-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="starboard-input"
                      disabled
                    />
                    <p className="text-xs text-slate-gray-500">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="starboard-input"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="starboard-input"
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="Your job title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                      <Input
                        id="linkedIn"
                        name="linkedIn"
                        value={formData.linkedIn}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter Handle</Label>
                      <Input
                        id="twitter"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleChange}
                        className="starboard-input"
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={value => handleSelectChange('timezone', value)}
                      >
                        <SelectTrigger className="starboard-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map(tz => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={formData.language}
                        onValueChange={value => handleSelectChange('language', value)}
                      >
                        <SelectTrigger className="starboard-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="starboard-input pr-10"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords(prev => ({
                            ...prev,
                            current: !prev.current,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500"
                      >
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="starboard-input pr-10"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords(prev => ({
                            ...prev,
                            new: !prev.new,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500"
                      >
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-gray-500">
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="starboard-input pr-10"
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords(prev => ({
                            ...prev,
                            confirm: !prev.confirm,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500"
                      >
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isPasswordLoading} className="starboard-button">
                    {isPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
