'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DynamicFormRenderer } from '@/components/applications/dynamic-form-renderer'
import {
  Clock,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Mail,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

export default function PublicApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const { applicationId } = params

  const [application, setApplication] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicantEmail, setApplicantEmail] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState('')
  const [existingSubmission, setExistingSubmission] = useState(null)
  const [error, setError] = useState(null)

  // Cookie helper functions
  const setCookie = (name, value, days = 30) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  const getCookie = (name) => {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  const isValidEmail = email => {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  const hasValidEmail = isValidEmail(applicantEmail)

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await fetch(`/api/public/applications/${applicationId}`)
        if (response.ok) {
          const result = await response.json()
          setApplication(result.data.application)
          console.log(result)
        } else if (response.status === 404) {
          setError('Application not found')
        } else if (response.status === 410) {
          setError('This application is no longer accepting submissions')
        } else {
          setError('Failed to load application')
        }
      } catch (error) {
        console.error('Error fetching application:', error)
        setError('Failed to load application')
      } finally {
        setIsLoading(false)
      }
    }

    const checkExistingSubmission = async () => {
      // Only check if we have an email from cookies
      const emailFromCookie = getCookie('email')
      if (emailFromCookie && isValidEmail(emailFromCookie)) {
        try {
          const response = await fetch(
            `/api/applications/${applicationId}/submit?email=${encodeURIComponent(emailFromCookie)}`
          )
          if (response.ok) {
            const result = await response.json()
            if (result.hasSubmission) {
              setExistingSubmission(result.submission)
            }
          }
        } catch (error) {
          console.error('Error checking existing submission:', error)
        }
      }
    }

    fetchApplication()
    checkExistingSubmission()
  }, [applicationId])

  useEffect(() => {
    // Load email from cookies on component mount
    const emailFromCookie = getCookie('email')
    if (emailFromCookie && isValidEmail(emailFromCookie)) {
      setApplicantEmail(emailFromCookie)
    }
  }, [])

  const handleEmailEdit = () => {
    setTempEmail(applicantEmail)
    setIsEditingEmail(true)
  }

  const handleEmailSave = () => {
    if (isValidEmail(tempEmail)) {
      const trimmedEmail = tempEmail.trim()
      setApplicantEmail(trimmedEmail)
      setCookie('email', trimmedEmail)
      setIsEditingEmail(false)
      toast.success('Email saved successfully')
    } else {
      toast.error('Please enter a valid email address')
    }
  }

  const handleEmailCancel = () => {
    setTempEmail('')
    setIsEditingEmail(false)
  }

  const handleSubmit = async responses => {
    if (!hasValidEmail) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        applicantEmail: applicantEmail.trim(),
        responses,
      }

      const response = await fetch(`/api/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(
          `Application submitted successfully! Confirmation email sent to ${applicantEmail}`
        )
        // Redirect to success page
        router.push(`/apply/${applicationId}/success?confirmation=CONFIRMED}`)
      } else {
        if (result.code === 'FORM_VALIDATION_ERROR') {
          toast.error('Please check your form responses')
        } else {
          console.log(result)
          toast.error(result.error.message || 'Failed to submit application')
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getApplicationStatus = () => {
    if (!application) return null

    const now = new Date()

    if (!application.isActive) {
      return { status: 'inactive', label: 'Closed', color: 'destructive' }
    }

    if (application.openDate && application.openDate > now) {
      return { status: 'scheduled', label: 'Opening Soon', color: 'warning' }
    }

    if (application.closeDate && application.closeDate < now) {
      return { status: 'closed', label: 'Closed', color: 'destructive' }
    }

    return { status: 'active', label: 'Open', color: 'success' }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <Card className="starboard-card max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-charcoal-900 mb-2">{error}</h2>
            <p className="text-slate-gray-600 mb-4">
              Please check the URL or contact support if you believe this is an error.
            </p>
            <Link href="/">
              <Button className="starboard-button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (existingSubmission) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="starboard-card">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-charcoal-900 mb-2">
                Application Already Submitted
              </h2>
              <p className="text-slate-gray-600 mb-4">
                You have already submitted an application for this program.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Confirmation Number:</strong> {existingSubmission.confirmationNumber}
                  </p>
                  <p>
                    <strong>Status:</strong> {existingSubmission.status}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {formatDate(existingSubmission.submittedAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </Link>
                <Button variant="outline">View Submission Status</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const applicationStatus = getApplicationStatus()

  return (
    <div className="min-h-screen bg-snow-100">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-slate-gray-600 hover:text-slate-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {applicationStatus && (
              <Badge variant={applicationStatus.color}>{applicationStatus.label}</Badge>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-charcoal-900">{application.title}</h1>
            <p className="text-lg text-slate-gray-600">{application.description}</p>
          </div>

          {/* Application Info */}
          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-slate-gray-600">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              {application.workspace.name}
            </div>
            {application.submissionCount > 0 && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                {application.submissionCount} applications
              </div>
            )}
            {application.closeDate && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Closes {formatRelativeTime(application.closeDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-gray-600" />
              <div>
                <p className="text-sm text-slate-gray-600">Submitting as:</p>
                {isEditingEmail ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={tempEmail}
                      onChange={e => setTempEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="h-8 w-64"
                    />
                    <Button size="sm" onClick={handleEmailSave} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEmailCancel}
                      className="h-8 w-8 p-0 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-charcoal-900">
                      {applicantEmail || 'No email provided'}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEmailEdit}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {!hasValidEmail && <Badge variant="destructive">Valid email required</Badge>}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {applicationStatus?.status !== 'active' ? (
          <Card className="starboard-card">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-charcoal-900 mb-2">
                Application Not Available
              </h2>
              <p className="text-slate-gray-600">
                {applicationStatus?.status === 'scheduled'
                  ? `This application will open ${formatRelativeTime(application.openDate)}`
                  : 'This application is no longer accepting submissions'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`space-y-6 ${!hasValidEmail ? 'blur-sm pointer-events-none' : ''}`}>
            {/* Application Form */}
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Application Form</CardTitle>
                <CardDescription>
                  Complete the form below to submit your application. Fields marked with * are
                  required.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicFormRenderer
                  fields={application.formFields}
                  initialValues={{}}
                  onValueChange={() => {}}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Required Overlay */}
        {!hasValidEmail && applicationStatus?.status === 'active' && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <Card className="starboard-card max-w-md mx-4">
              <CardContent className="pt-6 text-center">
                <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-charcoal-900 mb-2">Email Required</h2>
                <p className="text-slate-gray-600 mb-4">
                  Please provide a valid email address to continue with your application.
                </p>
                <div className="space-y-4">
                  <Input
                    type="email"
                    value={tempEmail}
                    onChange={e => setTempEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full"
                  />
                  <Button 
                    onClick={handleEmailSave} 
                    className="w-full"
                    disabled={!isValidEmail(tempEmail)}
                  >
                    Continue with Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Application Details */}
        {application.reviewerInstructions && (
          <Card className="starboard-card mt-8">
            <CardHeader>
              <CardTitle>Application Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-gray-600">{application.reviewerInstructions}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}