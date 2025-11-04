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
  Calendar,
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

  // Helper function to upload files
  const uploadFiles = async (files) => {
    const uploadPromises = Array.from(files).map(async file => {
      try {
        // Get presigned URL
        const response = await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            folder: 'application-uploads',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Failed to get upload URL for ${file.name}`)
        }

        const { data } = await response.json()

        // Upload file to S3
        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => 'Unknown error')
          console.error('S3 upload error:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
            url: data.uploadUrl
          })
          throw new Error(`Failed to upload ${file.name} to S3 (${uploadResponse.status})`)
        }

        return {
          fileName: file.name,
          fileUrl: data.fileUrl,
          fileKey: data.fileKey,
          fileSize: file.size,
          fileType: file.type,
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        throw new Error(`${file.name}: ${error.message}`)
      }
    })

    return await Promise.all(uploadPromises)
  }

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
    const emailFromCookie = getCookie('email')
    if (emailFromCookie && isValidEmail(emailFromCookie)) {
      setApplicantEmail(emailFromCookie)
    }
  }, [])

  const handleEmailEdit = () => {
    setTempEmail(applicantEmail)
    setIsEditingEmail(true)
  }

  const handleEmailSave = async () => {
    if (isValidEmail(tempEmail)) {
      const trimmedEmail = tempEmail.trim().toLowerCase()

     
      try {
        const response = await fetch(
          `/api/applications/${applicationId}/submit?email=${encodeURIComponent(trimmedEmail)}`
        )
        if (response.ok) {
          const result = await response.json()
          if (result.hasSubmission) {
            setExistingSubmission(result.submission)
            toast.error('You have already submitted an application with this email')
            return
          }
        }
      } catch (error) {
        console.error('Error checking existing submission:', error)
      }

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

    // Show loading toast
    const loadingToast = toast.loading('Validating your submission...')

    try {
      // Final check for duplicate submission
      const checkResponse = await fetch(
        `/api/applications/${applicationId}/submit?email=${encodeURIComponent(applicantEmail.trim())}`
      )
      if (checkResponse.ok) {
        const checkResult = await checkResponse.json()
        if (checkResult.hasSubmission) {
          toast.dismiss(loadingToast)
          toast.error('You have already submitted an application')
          setExistingSubmission(checkResult.submission)
          setIsSubmitting(false)
          return
        }
      }

      // Process file uploads after email validation
      toast.dismiss(loadingToast)
      const uploadingToast = toast.loading('Uploading files...')

      const processedResponses = { ...responses }

      // Check for file upload fields and process them
      for (const field of application.formFields) {
        if ((field.type === 'FILE_UPLOAD' || field.type === 'MULTI_FILE') && responses[field.id]) {
          const files = responses[field.id]
          if (files instanceof FileList && files.length > 0) {
            try {
              const uploadedFiles = await uploadFiles(files)
              processedResponses[field.id] =
                field.type === 'FILE_UPLOAD' ? uploadedFiles[0] : uploadedFiles
            } catch (error) {
              toast.dismiss(uploadingToast)
              toast.error(`Failed to upload files: ${error.message}`)
              setIsSubmitting(false)
              return
            }
          }
        }
      }

      toast.dismiss(uploadingToast)
      const submittingToast = toast.loading('Submitting your application...')

      const payload = {
        applicantEmail: applicantEmail.trim().toLowerCase(),
        responses: processedResponses,
      }

      const response = await fetch(`/api/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      toast.dismiss(submittingToast)

      if (response.ok) {
        toast.success(
          `Application submitted successfully! Confirmation email sent to ${applicantEmail}`
        )
        router.push(`/apply/${applicationId}/success?confirmation=CONFIRMED`)
      } else {
        if (result.code === 'FORM_VALIDATION_ERROR') {
          toast.error('Please check your form responses')
        } else if (result.code === 'VALIDATION_ERROR') {
          const errorMessage = result.error?.message || result.message || 'Please check your email address'
          toast.error(errorMessage)
        } else {
          console.log(result)
          toast.error(result.error?.message || result.message || 'Failed to submit application')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
            <p className="text-gray-600 mb-4">
              Please check the URL or contact support if you believe this is an error.
            </p>
            <Link href="/">
              <Button>
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
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Application Already Submitted
              </h2>
              <p className="text-gray-600 mb-4">
                You have already submitted an application for this program.
              </p>
              <div className="bg-green-50 border border-green-200 p-4 mb-6">
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
    <div className="min-h-screen bg-white">
   
      {/* Back Button */}
      <div className="container mx-auto px-4 py-6 ">
        <Link href="/" className="inline-flex items-center text-primary hover:text-blue-700 text-sm font-medium">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Programs
        </Link>
      </div>

    
      <div className="container mx-auto px-4 max-w-7xl mb-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          <div className="relative h-[300px] lg:h-[400px] overflow-hidden ">
            
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/noise.jpg"/>
            </div>
          </div>

          
          <div className=' w-full h-full flex flex-col justify-between'>
            <div>
               <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {application.title}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {application.description}
            </p>

            </div>
            
          <div className="py-8 mb-12">
           
          <div className="flex gap-6 justify-baseline h-full ">
            <div   className='bg-primary-50 flex flex-col items-center justify-center px-5 py-3'>
              <p className="text-sm text-gray-600 mb-1">Application Open</p>
              <p className="text-lg font-semibold text-gray-900">
                {application.openDate ? formatDate(application.openDate) : 'March 1, 2026'}
              </p>
            </div>
            <div className='bg-primary-50 flex flex-col items-center justify-center px-5 py-3'>
              <p className="text-sm text-gray-600 mb-1">Application Deadline</p>
              <p className="text-lg font-semibold text-gray-900">
                {application.closeDate ? formatDate(application.closeDate) : 'December 1, 2026'}
              </p>
            </div>
            
          
          
          </div>
      </div>
          </div>
        </div>
      </div>

   

      {/* Form Section */}
      <div className="container mx-auto px-4 max-w-3xl pb-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application form</h2>
          <p className="text-gray-600">
            Complete the form below to submit your application. Fields marked with * are required
          </p>
        </div>

        {applicationStatus?.status !== 'active' ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Application Not Available
              </h2>
              <p className="text-gray-600">
                {applicationStatus?.status === 'scheduled'
                  ? `This application will open ${formatRelativeTime(application.openDate)}`
                  : 'This application is no longer accepting submissions'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Email Section - Inline with Form */}
            <div className="bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Submitting as</p>
                  {isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={tempEmail}
                        onChange={e => setTempEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="max-w-md"
                        disabled={isSubmitting}
                      />
                      <Button size="sm" onClick={handleEmailSave} disabled={isSubmitting}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleEmailCancel} disabled={isSubmitting}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-medium text-gray-900">
                        {applicantEmail || 'No email provided'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEmailEdit}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={isSubmitting}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className={!hasValidEmail || isSubmitting ? 'blur-sm pointer-events-none' : ''}>
              <DynamicFormRenderer
                fields={application.formFields}
                initialValues={{}}
                onValueChange={() => {}}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* Submission Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-white mb-2">Submitting Application</h2>
              <p className="text-gray-200">
                Please wait while we process your application...
              </p>
            </div>
          </div>
        )}

        {/* Email Required Modal */}
        {!hasValidEmail && applicationStatus?.status === 'active' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4">
              <CardContent className="pt-6 text-center">
                <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Required</h2>
                <p className="text-gray-600 mb-6">
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
      </div>
    </div>
  )
}