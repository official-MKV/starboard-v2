'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SubmissionForm } from '@/components/demo-day/SubmissionForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Trophy, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Video,
  Presentation,
  Globe
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function PublicSubmissionPage({ params }) {
  const { eventId } = params
  const router = useRouter()

  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['public-demo-day', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to fetch event')
      }
      return response.json()
    },
  })

  const handleSubmissionSuccess = (submission) => {
    router.push(`/demo-days/${eventId}/success?submissionId=${submission.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !eventData?.data?.event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Demo Day Not Available</h2>
              <p className="text-gray-600">
                {error?.message || 'This demo day does not exist or is not available for public submissions.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const event = eventData.data.event
  const config = event.demoDayConfig
  const submissionStatus = event.submissionStatus

  const getSubmissionStatusAlert = () => {
    const now = new Date()
    const deadline = submissionStatus.deadline ? new Date(submissionStatus.deadline) : null

    if (!deadline) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Submission deadline is not yet announced.
          </AlertDescription>
        </Alert>
      )
    }

    if (submissionStatus.isOpen) {
      const timeRemaining = deadline.getTime() - now.getTime()
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))
      
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Submissions are open! {daysRemaining} days remaining until deadline.
          </AlertDescription>
        </Alert>
      )
    }

    if (submissionStatus.allowLate) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Submission deadline has passed, but late submissions are allowed.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Submission deadline has passed and submissions are now closed.
        </AlertDescription>
      </Alert>
    )
  }

 

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-6 space-y-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-3xl mb-2 flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  {event.title}
                </CardTitle>
                <p className="text-gray-600">{event.description}</p>
              </div>
              <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
                Demo Day
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Event Date</p>
                  <p className="font-medium">
                    {format(new Date(event.startDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Start Time</p>
                  <p className="font-medium">
                    {format(new Date(event.startDate), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {event.isVirtual ? (
                  <Globe className="w-5 h-5 text-purple-500" />
                ) : (
                  <MapPin className="w-5 h-5 text-purple-500" />
                )}
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">
                    {event.isVirtual ? 'Virtual Event' : event.location || 'TBA'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Submissions</p>
                  <p className="font-medium">{event.submissionCount} teams</p>
                </div>
              </div>
            </div>

            {config && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Important Dates
                  </h3>
                  <div className="space-y-3">
                    {submissionStatus.deadline && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                        <span className="text-sm font-medium">Submission Deadline</span>
                        <span className="text-sm text-gray-600">
                          {format(new Date(submissionStatus.deadline), 'MMM dd, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <span className="text-sm font-medium">Demo Day Event</span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(event.startDate), 'MMM dd, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Requirements
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>Max team size: {config.maxTeamSize} members</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Max pitch duration: {config.maxPitchDuration} minutes</span>
                    </div>
                    
                    {config.requireVideo && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Video className="w-4 h-4" />
                        <span>Pitch video required</span>
                      </div>
                    )}
                    
                    {config.requirePresentation && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Presentation className="w-4 h-4" />
                        <span>Presentation deck required</span>
                      </div>
                    )}
                    
                    {config.requireDemo && (
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Globe className="w-4 h-4" />
                        <span>Live demo required</span>
                      </div>
                    )}
                    
                    {config.requireBusinessPlan && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <FileText className="w-4 h-4" />
                        <span>Business plan required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {config?.description && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Instructions for Startups</h4>
                <p className="text-blue-800 text-sm whitespace-pre-line">{config.description}</p>
              </div>
            )}

            {getSubmissionStatusAlert()}
          </CardContent>
        </Card>
 
          <SubmissionForm 
            eventId={eventId}
            isPublicSubmission={true}
            onSuccess={handleSubmissionSuccess}
            demoDayConfig={config}
          />
       
      </div>
    </div>
  )
}