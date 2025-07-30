import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { submissionId } = params

    const submission = await DemoDayService.submitSubmission(submissionId, session.user.id)

    return NextResponse.json({
      success: true,
      data: { submission }
    })

  } catch (error) {
    logger.error('Failed to submit demo day submission', { submissionId: params.submissionId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to submit submission' } },
      { status: 500 }
    )
  }
}