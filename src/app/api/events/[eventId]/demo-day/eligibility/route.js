import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = params

    const eligibility = await DemoDayService.canUserSubmit(eventId, session.user.id)

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        demoDayConfig: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    const existingSubmission = await prisma.demoDaySubmission.findUnique({
      where: {
        eventId_submitterId: {
          eventId,
          submitterId: session.user.id,
        }
      }
    })

    const config = event.demoDayConfig
    const now = new Date()
    const deadlinePassed = config && new Date(config.submissionDeadline) < now
    const canSubmitLate = config?.allowLateSubmissions || false

    const response = {
      canSubmit: eligibility.allowed,
      reason: eligibility.reason,
      hasExistingSubmission: !!existingSubmission,
      existingSubmissionId: existingSubmission?.id,
      deadlinePassed,
      canSubmitLate,
      submissionDeadline: config?.submissionDeadline,
      eventConfig: {
        maxTeamSize: config?.maxTeamSize,
        maxPitchDuration: config?.maxPitchDuration,
        requireVideo: config?.requireVideo,
        requirePresentation: config?.requirePresentation,
        requireDemo: config?.requireDemo,
        requireBusinessPlan: config?.requireBusinessPlan,
        categories: config?.categories || [],
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    logger.error('Failed to check demo day eligibility', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to check eligibility' } },
      { status: 500 }
    )
  }
}