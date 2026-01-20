'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  Star,
  ArrowRight,
  Trash2,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { format } from 'date-fns'
import { toast } from 'sonner'
import EvaluatorScoringModal from '@/components/applications/evaluation/evaluator-scoring-modal'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/utils/permissions'

// Helper function to get status info
const getStatusInfo = (status) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText }
    case 'SUBMITTED':
      return { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    case 'UNDER_REVIEW':
      return { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    case 'ACCEPTED':
      return { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
    case 'WAITLISTED':
      return { label: 'Waitlisted', color: 'bg-orange-100 text-orange-800', icon: Clock }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText }
  }
}

// Helper function to get field options
const getFieldOptions = (field) => {
  if (!field.options) return [];

  // If it's already an array, return it
  if (Array.isArray(field.options)) return field.options;

  // If it's a string, try to parse it
  if (typeof field.options === 'string') {
    try {
      const parsed = JSON.parse(field.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // If it's an object (Prisma JsonValue), try to convert
  if (typeof field.options === 'object') {
    const keys = Object.keys(field.options);
    if (keys.every(k => !isNaN(k))) {
      return Object.values(field.options);
    }
  }

  return [];
};

// Helper function to render field value
const renderFieldValue = (field, value) => {
  if (!value && value !== 0 && value !== false) return 'N/A'

  switch (field.type) {
    case 'FILE_UPLOAD':
      if (typeof value === 'object' && value.fileUrl) {
        return (
          <a
            href={value.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            {value.fileName || 'View File'}
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      }
      return 'N/A'

    case 'MULTI_FILE':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="space-y-1">
            {value.map((file, index) => (
              <a
                key={index}
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {file.fileName || `File ${index + 1}`}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )
      }
      return 'N/A'

    case 'URL':
      return (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </a>
      )

    case 'EMAIL':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'PHONE':
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'SELECT':
    case 'RADIO': {
      // For SELECT and RADIO, look up the label from options
      const options = getFieldOptions(field);
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption ? selectedOption.label : value;
    }

    case 'CHECKBOX': {
      // For CHECKBOX, value is an array of selected values
      const options = getFieldOptions(field);
      const selectedValues = Array.isArray(value) ? value : [value];
      const labels = selectedValues
        .map(val => {
          const option = options.find(opt => opt.value === val);
          return option ? option.label : val;
        })
        .filter(Boolean);
      return labels.length > 0 ? labels.join(', ') : value;
    }

    case 'BOOLEAN':
      return value ? 'Yes' : 'No'

    case 'DATE':
      try {
        return format(new Date(value), 'MMM d, yyyy')
      } catch {
        return value
      }

    case 'DATETIME':
      try {
        return format(new Date(value), 'MMM d, yyyy h:mm a')
      } catch {
        return value
      }

    case 'TEXTAREA':
      return <div className="whitespace-pre-wrap">{value}</div>

    default:
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return value.toString()
  }
}

export default function SubmissionDetailPage({ params }) {
  const router = useRouter()
  const { data: session } = useSession()
  const { hasPermission } = usePermissions()

  // Unwrap params Promise for Next.js 15+ compatibility
  const { applicationId, submissionId } = use(params)

  // Get return URL parameters
  const searchParams = useSearchParams()
  const returnTab = searchParams?.get('returnTab') || 'submissions'
  const returnFilter = searchParams?.get('returnFilter') || 'step1'

  // Function to go back to application with state
  const goBackToApplication = () => {
    const params = new URLSearchParams()
    params.set('tab', returnTab)
    if (returnFilter) params.set('filter', returnFilter)
    router.push(`/applications/${applicationId}?${params.toString()}`)
  }

  // State for scoring modal
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(null)
  const [hasScored, setHasScored] = useState(false)
  const [evalSettings, setEvalSettings] = useState({ minScore: 1, maxScore: 10 })
  const [evaluationScores, setEvaluationScores] = useState(null)

  // State for navigation
  const [submissionIds, setSubmissionIds] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // Fetch submission details
  const { data: submissionData, isLoading, refetch: refetchSubmission } = useQuery({
    queryKey: ['application-submission', applicationId, submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${applicationId}/submissions/${submissionId}`)
      if (!response.ok) throw new Error('Failed to fetch submission')
      return response.json()
    },
  })

  // Fetch evaluation steps and check if user has scored
  const { data: evaluationData } = useQuery({
    queryKey: ['evaluation-status', applicationId, submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${applicationId}/evaluation/steps`)
      if (!response.ok) return null
      const data = await response.json()
      return data.data
    },
    enabled: !!session?.user?.id && !!submissionData?.data?.submission,
  })

  const submission = submissionData?.data?.submission

  // Fetch all submission IDs for navigation (respecting the filter from the table)
  useEffect(() => {
    const fetchSubmissionIds = async () => {
      try {
        // Build query params to match the filter from the submissions table
        const queryParams = new URLSearchParams({
          limit: '10000' // Get all submissions for this filter
        })

        // Apply the same filter as the submissions table
        if (returnFilter && returnFilter !== 'all') {
          const stepNumber = returnFilter === 'step1' ? '1' : '2'
          queryParams.set('currentStep', stepNumber)
        }

        const response = await fetch(`/api/applications/${applicationId}/submissions?${queryParams}`)
        if (!response.ok) return
        const data = await response.json()
        const ids = data.data?.submissions?.map(s => s.id) || []
        setSubmissionIds(ids)
        setCurrentIndex(ids.indexOf(submissionId))
      } catch (error) {
        console.error('Error fetching submission IDs:', error)
      }
    }

    fetchSubmissionIds()
  }, [applicationId, submissionId, returnFilter])

  // Check evaluation status and load scores
  useEffect(() => {
    if (submission && evaluationData && session?.user?.id) {
      const currentStep = submission.currentStep || 1
      const step = evaluationData.find(s => s.stepNumber === currentStep)

      if (step) {
        setActiveStep(step)

        // Check if user has already scored this submission at this step
        fetch(`/api/applications/${applicationId}/evaluation/steps/${step.id}/my-score?submissionId=${submissionId}`)
          .then(res => res.json())
          .then(data => {
            setHasScored(!!data.data?.score)
          })
          .catch(() => setHasScored(false))

        // Load evaluation scores specifically for THIS submission at THIS step
        fetch(`/api/applications/${applicationId}/evaluation/steps/${step.id}/scoreboard?submissionId=${submissionId}`)
          .then(res => res.json())
          .then(data => {
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              // Find the exact submission match by ID
              const submissionScores = data.data.find(s => s.id === submissionId)
              if (submissionScores) {
                setEvaluationScores(submissionScores)
              } else {
                setEvaluationScores(null)
              }
            } else {
              setEvaluationScores(null)
            }
          })
          .catch(err => {
            console.error('Error loading scores:', err)
            setEvaluationScores(null)
          })
      }

      // Load evaluation settings
      if (submission.application?.evaluationSettings) {
        const settings = typeof submission.application.evaluationSettings === 'string'
          ? JSON.parse(submission.application.evaluationSettings)
          : submission.application.evaluationSettings
        setEvalSettings({
          minScore: settings.minScore || 1,
          maxScore: settings.maxScore || 10
        })
      }
    }
  }, [submission, evaluationData, session, applicationId, submissionId])

  // Navigation handlers
  const goToPrevious = () => {
    if (currentIndex > 0 && submissionIds[currentIndex - 1]) {
      const params = new URLSearchParams()
      params.set('returnTab', returnTab)
      if (returnFilter) params.set('returnFilter', returnFilter)
      router.push(`/applications/${applicationId}/submissions/${submissionIds[currentIndex - 1]}?${params.toString()}`)
    }
  }

  const goToNext = () => {
    if (currentIndex < submissionIds.length - 1 && submissionIds[currentIndex + 1]) {
      const params = new URLSearchParams()
      params.set('returnTab', returnTab)
      if (returnFilter) params.set('returnFilter', returnFilter)
      router.push(`/applications/${applicationId}/submissions/${submissionIds[currentIndex + 1]}?${params.toString()}`)
    }
  }

  // Admin actions
  const handleAdvance = async () => {
    if (!activeStep) return

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${activeStep.id}/advance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionIds: [submissionId] })
        }
      )

      if (!response.ok) throw new Error('Failed to advance submission')

      toast.success('Submission advanced to next step')
      refetchSubmission()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    }
  }

  const handleAdmit = async () => {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/admit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionIds: [submissionId] })
        }
      )

      if (!response.ok) throw new Error('Failed to admit submission')

      toast.success('Submission admitted')
      refetchSubmission()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this submission?')) return

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/submissions/bulk-reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionIds: [submissionId] })
        }
      )

      if (!response.ok) throw new Error('Failed to reject submission')

      toast.success('Submission rejected')
      refetchSubmission()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Not Found</h3>
          <p className="text-sm text-gray-600 mb-4">The submission you're looking for doesn't exist.</p>
          <Button onClick={goBackToApplication}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Application
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(submission.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBackToApplication}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Application
            </Button>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 border-l pl-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentIndex <= 0}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2">
                {currentIndex + 1} of {submissionIds.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex >= submissionIds.length - 1}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {submission.application?.title || 'Application Submission'}
              </h1>
              <p className="text-sm text-gray-600">
                Confirmation: {submission.confirmationNumber || submission.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin Action Buttons - Only show if submission has been evaluated and passed */}
            {activeStep && submission.status !== 'ACCEPTED' && submission.status !== 'REJECTED' && (
              <>
                {/* Advance button - Only for Step 1 if PASSED */}
                {submission.currentStep === 1 &&
                 evaluationScores &&
                 evaluationScores.status === 'PASSED' &&
                 hasPermission(PERMISSIONS.EVALUATION_ADVANCE) && (
                  <Button
                    onClick={handleAdvance}
                    variant="default"
                    size="sm"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Advance to Step 2
                  </Button>
                )}

                {/* Admit button - Only for Step 2 if PASSED */}
                {submission.currentStep === 2 &&
                 evaluationScores &&
                 evaluationScores.status === 'PASSED' &&
                 hasPermission(PERMISSIONS.EVALUATION_ADMIT) && (
                  <Button
                    onClick={handleAdmit}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Admit to Program
                  </Button>
                )}

                {/* Reject button - Show for admins */}
                {hasPermission(PERMISSIONS.EVALUATION_ADMIT) && (
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                )}
              </>
            )}

            {/* Evaluator Scoring Button */}
            {activeStep && !hasScored && (
              <Button
                onClick={() => setIsScoringModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Star className="w-4 h-4 mr-2" />
                Score This Submission
              </Button>
            )}

            {activeStep && hasScored && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Already Scored
              </Badge>
            )}

            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Applicant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Applicant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submission.applicantEmail && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900">
                    <a href={`mailto:${submission.applicantEmail}`} className="text-blue-600 hover:underline">
                      {submission.applicantEmail}
                    </a>
                  </p>
                </div>
              )}

              {(submission.applicantFirstName || submission.applicantLastName) && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Name
                  </label>
                  <p className="text-gray-900">
                    {submission.applicantFirstName} {submission.applicantLastName}
                  </p>
                </div>
              )}

              {submission.applicantPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-gray-900">
                    <a href={`tel:${submission.applicantPhone}`} className="text-blue-600 hover:underline">
                      {submission.applicantPhone}
                    </a>
                  </p>
                </div>
              )}

              {submission.companyName && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    Company
                  </label>
                  <p className="text-gray-900">{submission.companyName}</p>
                </div>
              )}

              {submission.submittedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Submitted
                  </label>
                  <p className="text-gray-900">{format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}

              {submission.reviewedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Reviewed
                  </label>
                  <p className="text-gray-900">{format(new Date(submission.reviewedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>

            {submission.reviewNotes && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="text-sm font-medium text-blue-900 flex items-center gap-1 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Review Notes
                </label>
                <p className="text-blue-800 whitespace-pre-wrap">{submission.reviewNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Scores */}
        {activeStep && evaluationScores && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Evaluation Scores - {activeStep.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Score Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-500">Average Score</label>
                  <p className="text-2xl font-bold text-gray-900">
                    {evaluationScores.averageScore?.toFixed(2) || 'N/A'} / {evalSettings.maxScore}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Evaluator Progress</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {evaluationScores.evaluatorCount || 0} / {evaluationScores.totalJudges || 0} evaluators
                    {evaluationScores.evaluatorPercentage && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({evaluationScores.evaluatorPercentage.toFixed(0)}%)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {evaluationScores.status === 'PASSED' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Passed Cutoff
                      </Badge>
                    ) : evaluationScores.status === 'FAILED' ? (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Below Cutoff
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Evaluator Scores - Only visible to admins */}
              {hasPermission(PERMISSIONS.EVALUATION_VIEW_SCORES) && evaluationScores.scores && evaluationScores.scores.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Individual Evaluator Scores</h4>
                  <div className="space-y-3">
                    {evaluationScores.scores.map((score) => (
                      <div key={score.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {score.judge?.firstName?.[0]}{score.judge?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {score.judge?.firstName} {score.judge?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {score.createdAt && format(new Date(score.createdAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {score.totalScore?.toFixed(2) || 'N/A'} / {evalSettings.maxScore}
                            </p>
                          </div>
                        </div>
                        {score.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <p className="font-medium text-xs text-gray-500 mb-1">Notes:</p>
                            <p className="whitespace-pre-wrap">{score.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message for evaluators who can't see all scores */}
              {!hasPermission(PERMISSIONS.EVALUATION_VIEW_SCORES) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    You can see the overall evaluation summary. Individual evaluator scores are only visible to administrators.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Application Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.application?.formFields && submission.application.formFields.length > 0 ? (
              <div className="space-y-6">
                {submission.application.formFields
                  .filter(field => field.type !== 'SECTION_HEADER')
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => {
                    const value = submission.responses?.[field.id]
                    return (
                      <div key={field.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                        )}
                        <div className="text-gray-900">
                          {renderFieldValue(field, value)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No form fields available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evaluator Scoring Modal */}
      {activeStep && (
        <EvaluatorScoringModal
          isOpen={isScoringModalOpen}
          onClose={() => setIsScoringModalOpen(false)}
          submission={submission}
          step={activeStep}
          applicationId={applicationId}
          minScore={evalSettings.minScore}
          maxScore={evalSettings.maxScore}
          onScoreSubmitted={() => {
            setHasScored(true)
            refetchSubmission()
            // Reload scores
            fetch(`/api/applications/${applicationId}/evaluation/steps/${activeStep.id}/scoreboard?submissionId=${submissionId}`)
              .then(res => res.json())
              .then(data => {
                if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                  setEvaluationScores(data.data[0])
                }
              })
              .catch(err => console.error('Error loading scores:', err))
          }}
        />
      )}
    </div>
  )
}
