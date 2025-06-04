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

            {/* Next Steps */}
            <div className="text-left">
              <h3 className="font-semibold text-charcoal-800 mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">Email Confirmation</p>
                    <p className="text-sm text-slate-gray-600">
                      You'll receive a confirmation email shortly with your application details.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="h-3 w-3 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">Application Review</p>
                    <p className="text-sm text-slate-gray-600">
                      Our team will carefully review your application. This typically takes 2-3
                      weeks.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal-800">Decision Notification</p>
                    <p className="text-sm text-slate-gray-600">
                      We'll email you with our decision and next steps if you're selected.
                    </p>
                  </div>
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

              <Button variant="outline" onClick={handleShare} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>

              <Button variant="outline" onClick={() => window.print()} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-800 mb-2">Important Notes:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Please save your confirmation number for your records</li>
                <li>• Check your email (including spam folder) for confirmation</li>
                <li>• You can contact us if you don't hear back within 3 weeks</li>
                <li>• Additional documents may be requested during the review process</li>
              </ul>
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
