'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

const errorMessages = {
  Configuration: {
    title: 'Server Configuration Error',
    description: 'There is a problem with the server configuration. Please try again later.',
    action: 'Try Again',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in with this account.',
    action: 'Go Back',
  },
  Verification: {
    title: 'Email Verification Required',
    description: 'Please check your email and click the verification link before signing in.',
    action: 'Back to Login',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication. Please try again.',
    action: 'Try Again',
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'

  const errorInfo = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-snow-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal-900">Authentication Error</h1>
          <p className="text-slate-gray-600 mt-2">Something went wrong while signing you in</p>
        </div>

        <Card className="starboard-card border-red-200">
          <CardHeader className="text-center">
            <CardTitle className="text-red-800">{errorInfo.title}</CardTitle>
            <CardDescription className="text-red-600">{errorInfo.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Details */}
            {error !== 'Default' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Error Code:</strong> {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button asChild className="w-full starboard-button">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {errorInfo.action}
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-neutral-200">
              <p className="text-sm text-slate-gray-600">
                Still having trouble?{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact Support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Common Solutions */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-800 mb-2">Common Solutions:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Clear your browser cache and cookies</li>
              <li>• Try using an incognito/private browser window</li>
              <li>• Check if your email needs verification</li>
              <li>• Ensure your account is active</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
