'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, Loader2, Check } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()

    if (!email) {
      setError('Email is required')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email address')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      if (response.ok) {
        setIsEmailSent(true)
        toast.success('Password reset email sent!')
      } else {
        const result = await response.json()
        toast.error(result.error?.message || 'Failed to send reset email')
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900">Check your email</h1>
            <p className="text-slate-gray-600 mt-2">
              We've sent a password reset link to your email
            </p>
          </div>

          <Card className="starboard-card">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800">We've sent a password reset link to:</p>
                <p className="font-medium text-green-900 mt-1">{email}</p>
              </div>

              <div className="text-sm text-slate-gray-600 space-y-2">
                <p>Click the link in the email to reset your password.</p>
                <p>If you don't see the email, check your spam folder.</p>
              </div>

              <div className="space-y-3 pt-4">
                <Button asChild className="w-full starboard-button">
                  <Link href="/auth/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEmailSent(false)
                    setEmail('')
                  }}
                  className="w-full"
                >
                  Try Different Email
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
          <h1 className="text-2xl font-bold text-charcoal-900">Forgot your password?</h1>
          <p className="text-slate-gray-600 mt-2">No worries, we'll send you reset instructions</p>
        </div>

        <Card className="starboard-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a password reset link
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  className={`starboard-input ${error ? 'field-error' : ''}`}
                  disabled={isLoading}
                />
                {error && <p className="error-message">{error}</p>}
              </div>

              <Button type="submit" className="w-full starboard-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>

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

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-gray-600">
            Still having trouble?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
