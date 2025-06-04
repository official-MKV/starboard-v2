'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password strength validation
  const getPasswordStrength = password => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Account created successfully!')
        toast.info('Please check your email to verify your account')

        // Redirect to login page
        router.push('/auth/login?message=Please check your email to verify your account')
      } else {
        if (result.error?.code === 'DUPLICATE_ENTRY') {
          setErrors({ email: 'An account with this email already exists' })
          toast.error('An account with this email already exists')
        } else {
          toast.error(result.error?.message || 'Registration failed')
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Create your account</h1>
          <p className="text-slate-gray-600 mt-2">
            Join Starboard and manage your accelerator journey
          </p>
        </div>

        <Card className="starboard-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign up</CardTitle>
            <CardDescription>Create your account to get started</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`starboard-input ${errors.firstName ? 'field-error' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.firstName && <p className="error-message">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`starboard-input ${errors.lastName ? 'field-error' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.lastName && <p className="error-message">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`starboard-input ${errors.email ? 'field-error' : ''}`}
                  disabled={isLoading}
                />
                {errors.email && <p className="error-message">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`starboard-input pr-10 ${errors.password ? 'field-error' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500 hover:text-slate-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`starboard-input pr-10 ${
                      errors.confirmPassword ? 'field-error' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-gray-500 hover:text-slate-gray-700"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
