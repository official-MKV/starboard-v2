'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Camera,
  Save,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

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
    website: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        company: user.company || '',
        website: user.website || '',
      })
    }
  }, [user])

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = e => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        await updateSession()
        toast.success('Profile updated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()

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
      const response = await fetch('/api/profile/password', {
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
        toast.error(error.message || 'Failed to update password')
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

  return (
    <div className="min-h-screen bg-snow-100">
      <DashboardNav user={user} />

      <div className="pl-64">
        <DashboardHeader
          title="Profile Settings"
          description="Manage your account information and preferences"
        />

        <main className="p-6 max-w-4xl">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Overview */}
            <div className="lg:col-span-1">
              <Card className="starboard-card">
                <CardHeader className="text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white font-bold text-2xl">
                        {getInitials(`${user.firstName} ${user.lastName}`)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    >
                      <Camera size={14} />
                    </Button>
                  </div>
                  <CardTitle>
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-slate-gray-600">
                      <Mail size={16} className="mr-2" />
                      {user.email}
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
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="starboard-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="starboard-input"
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

                    <Button type="submit" disabled={isLoading} className="starboard-button">
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
                  </form>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
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
    </div>
  )
}
