import { NextResponse } from 'next/server'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function POST(request) {
  let body

  try {
    body = await request.json()
    const { workspaceId, profileData, uploadedFiles = {}, userId } = body

    if (!workspaceId || !profileData || !userId) {
      return NextResponse.json(
        { error: { message: 'workspaceId, profileData, and userId are required' } },
        { status: 400 }
      )
    }

    // Merge uploaded files into profile data for processing
    const profileDataWithFiles = {
      ...profileData,
      ...uploadedFiles,
    }

    // Use the OnboardingService to complete onboarding
    const updatedUser = await OnboardingService.completeOnboarding(
      userId,
      workspaceId,
      profileDataWithFiles
    )

    logger.info('Onboarding completed via public API', {
      userId,
      workspaceId,
      filesUploaded: Object.keys(uploadedFiles).length,
    })

    // Get workspace details for response
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        user: updatedUser,
        workspace,
        requiresSignIn: true,
      },
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    logger.error('Failed to complete public onboarding', {
      error: error.message,
      userId: body?.userId,
      workspaceId: body?.workspaceId,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to complete onboarding' } },
      { status: 500 }
    )
  }
}
