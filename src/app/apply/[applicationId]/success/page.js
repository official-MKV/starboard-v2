'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home } from 'lucide-react'

export default function ApplicationSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { applicationId } = params
  const confirmationNumber = searchParams.get('confirmation')

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 border-2 border-primary">
          <CheckCircle className="h-12 w-12 text-primary" strokeWidth={2.5} />
        </div>

        {/* Main Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">
            Application Submitted
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Thank you for your submission. We've received your application and will review it carefully.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="bg-gray-50 border border-gray-200 p-8 max-w-md mx-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Confirmation Number</span>
              <span className="font-mono font-semibold text-gray-900 text-lg">
                {confirmationNumber || 'N/A'}
              </span>
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Submitted</span>
              <span className="text-gray-900 font-medium">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className="inline-flex items-center gap-2 text-gray-900 font-medium">
                <div className="w-2 h-2 bg-primary"></div>
                Under Review
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link href="/">
            <button className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 font-medium hover:bg-primary-600 transition-colors">
              <Home className="h-4 w-4" />
              Return Home
            </button>
          </Link>
        </div>

        {/* Contact Information */}
        <div className="pt-8 border-t border-gray-200 max-w-md mx-auto">
          <p className="text-sm text-gray-600">
            Questions about your application?{' '}
            <Link
              href="mailto:support@mystarboard.ng"
              className="text-primary font-medium hover:underline"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
