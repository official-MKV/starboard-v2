'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Mail, Calendar, Home, Share2 } from 'lucide-react'

export default function ApplicationSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { applicationId } = params
  const confirmationNumber = searchParams.get('confirmation')

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Application Submitted Successfully',
          text: `I just submitted my application! Confirmation: ${confirmationNumber}`,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(
        `Application submitted successfully! Confirmation: ${confirmationNumber}`
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-snow-100">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="starboard-card text-center">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-charcoal-900">
              Application Submitted Successfully!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-lg text-slate-gray-600">
              Thank you for your application. We have received your submission and will review it
              carefully.
            </p>

            {/* Confirmation Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">Confirmation Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">Confirmation Number:</span>
                  <span className="font-mono font-semibold text-green-800">
                    {confirmationNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Submitted:</span>
                  <span className="text-green-800">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Status:</span>
                  <span className="text-green-800">Under Review</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </Link>
            </div>

            {/* Contact Information */}
            <div className="border-t border-neutral-200 pt-4">
              <p className="text-sm text-slate-gray-600">
                Questions about your application?{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact our support team
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
