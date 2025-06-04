import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/onboarding/[id]/complete
 * Complete onboarding flow
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { onboardingId } = params
    const body = await request.json()
    const { responses, termsAccepted = false } = body

    if (!onboardingId) {
      return NextResponse.json({ error: { message: 'Onboarding ID is required' } }, { status: 400 })
    }

    // Complete the onboarding
    const result = await OnboardingService.complete(session.user.id, onboardingId, {
      responses,
      termsAccepted,
    })

    logger.info('Onboarding completed', {
      userId: session.user.id,
      onboardingId,
      completionId: result.completion.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        completion: result.completion,
        redirectUrl: result.redirectUrl,
        nextStep: 'dashboard',
      },
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    logger.error('Error completing onboarding', {
      userId: session?.user?.id,
      onboardingId: params.id,
      error: error.message,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to complete onboarding' } },
      { status: 500 }
    )
  }
}
