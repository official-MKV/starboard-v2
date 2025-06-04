'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Check, X, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(null)
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false,
  })

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password/verify?token=${token}`)
        setIsValidToken(response.ok)
      } catch (error) {
        setIsValidToken(false)
      }
    }

    verifyToken()
  }, [token])

  // Password strength validation
  const getPasswordStrength = password => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    }

    const score = Object.values(requirements).filter(Boolean).length
    return { requirements, score }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password does not meet minimum requirements'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Password reset successfully!')
        router.push(
          '/auth/login?message=Password reset successfully. You can now sign in with your new password.'
        )
      } else {
        if (result.error?.code === 'TOKEN_EXPIRED') {
          toast.error('Reset link has expired. Please request a new one.')
          router.push('/auth/forgot-password')
        } else {
          toast.error(result.error?.message || 'Failed to reset password')
        }
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while verifying token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slate-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900">Invalid Reset Link</h1>
            <p className="text-slate-gray-600 mt-2">
              This password reset link is invalid or has expired
            </p>
          </div>

          <Card className="starboard-card border-red-200">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  The password reset link you used is either invalid or has expired.
                </p>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full starboard-button">
                  <Link href="/auth/forgot-password">Request New Reset Link</Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Reset your password</h1>
          <p className="text-slate-gray-600 mt-2">Enter your new password below</p>
        </div>

        <Card className="starboard-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">New Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPasswords.password ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`starboard-input pr-10 ${errors.password ? 'field-error' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords(prev => ({
                        ...prev,
                        password: !prev.password,
                      }))
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500 hover:text-slate-gray-700"
                    disabled={isLoading}
                  >
                    {showPasswords.password ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-slate-gray-600 mb-1">Password requirements:</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div
                        className={`flex items-center ${
                          passwordStrength.requirements.length
                            ? 'text-green-600'
                            : 'text-slate-gray-400'
                        }`}
                      >
                        {passwordStrength.requirements.length ? (
                          <Check size={12} className="mr-1" />
                        ) : (
                          <X size={12} className="mr-1" />
                        )}
                        8+ characters
                      </div>
                      <div
                        className={`flex items-center ${
                          passwordStrength.requirements.uppercase
                            ? 'text-green-600'
                            : 'text-slate-gray-400'
                        }`}
                      >
                        {passwordStrength.requirements.uppercase ? (
                          <Check size={12} className="mr-1" />
                        ) : (
                          <X size={12} className="mr-1" />
                        )}
                        Uppercase
                      </div>
                      <div
                        className={`flex items-center ${
                          passwordStrength.requirements.lowercase
                            ? 'text-green-600'
                            : 'text-slate-gray-400'
                        }`}
                      >
                        {passwordStrength.requirements.lowercase ? (
                          <Check size={12} className="mr-1" />
                        ) : (
                          <X size={12} className="mr-1" />
                        )}
                        Lowercase
                      </div>
                      <div
                        className={`flex items-center ${
                          passwordStrength.requirements.number
                            ? 'text-green-600'
                            : 'text-slate-gray-400'
                        }`}
                      >
                        {passwordStrength.requirements.number ? (
                          <Check size={12} className="mr-1" />
                        ) : (
                          <X size={12} className="mr-1" />
                        )}
                        Number
                      </div>
                    </div>
                  </div>
                )}

                {errors.password && <p className="error-message">{errors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`starboard-input pr-10 ${
                      errors.confirmPassword ? 'field-error' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords(prev => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500 hover:text-slate-gray-700"
                    disabled={isLoading}
                  >
                    {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="error-message">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full starboard-button"
                disabled={isLoading || passwordStrength.score < 3}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-slate-gray-600 hover:text-slate-gray-800 flex items-center justify-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
