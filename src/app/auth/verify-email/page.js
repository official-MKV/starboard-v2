'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2, Mail, ArrowLeft } from 'lucide-react'

function VerifyEmailPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // loading, success, error, expired
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')
          toast.success('Email verified successfully!')

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/auth/login?message=Email verified successfully. You can now sign in.')
          }, 3000)
        } else {
          if (result.error?.code === 'TOKEN_EXPIRED') {
            setStatus('expired')
            setMessage('The verification link has expired. Please request a new one.')
          } else {
            setStatus('error')
            setMessage(result.error?.message || 'Email verification failed')
          }
        }
      } catch (error) {
        console.error('Email verification error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred during verification')
      }
    }

    verifyEmail()
  }, [token, router])

  const handleResendVerification = async () => {
    if (!token) return

    setIsResending(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        toast.success('Verification email sent successfully!')
        setMessage('A new verification email has been sent. Please check your inbox.')
      } else {
        toast.error('Failed to send verification email')
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsResending(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Verifying your email</h1>
            <p className="text-slate-gray-600">Please wait while we verify your email address...</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Email verified!</h1>
            <p className="text-slate-gray-600 mb-4">{message}</p>

            <Card className="starboard-card border-green-200">
              <CardContent className="pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <Check className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800 text-center">
                    Your email address has been successfully verified. You can now access all
                    features of your Starboard account.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button asChild className="w-full starboard-button">
                    <Link href="/auth/login">Continue to Login</Link>
                  </Button>

                  <p className="text-xs text-slate-gray-500 text-center">
                    Redirecting automatically in a few seconds...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Verification link expired</h1>
            <p className="text-slate-gray-600 mb-4">{message}</p>

            <Card className="starboard-card border-yellow-200">
              <CardContent className="pt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 text-center">
                    The verification link you used has expired. Click below to receive a new
                    verification email.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full starboard-button"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send New Verification Email
                      </>
                    )}
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
        )

      case 'error':
      default:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Verification failed</h1>
            <p className="text-slate-gray-600 mb-4">{message}</p>

            <Card className="starboard-card border-red-200">
              <CardContent className="pt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800 text-center">
                    We couldn't verify your email address. This could be due to an invalid or
                    expired verification link.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/auth/register">Try Registering Again</Link>
                  </Button>

                  <Button variant="outline" asChild className="w-full">
                    <Link href="/contact">Contact Support</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        {renderContent()}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-slate-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailPageInner />
    </Suspense>
  )
}
