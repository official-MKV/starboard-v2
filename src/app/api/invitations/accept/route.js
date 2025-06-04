// app/api/invitations/accept/route.js - UPDATED TO USE QUERY PARAMETERS
import { NextResponse } from 'next/server'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/invitations/accept?token=xxx
 * Accept invitation and create user account using query parameter
 */
export async function POST(request) {
  try {
    // Extract token from query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const body = await request.json()
    const { firstName, lastName, password, avatar } = body

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Invitation token is required as query parameter' } },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: { message: 'First name and last name are required' } },
        { status: 400 }
      )
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 8 characters long' } },
        { status: 400 }
      )
    }

    // Accept the invitation
    const result = await InvitationService.accept(token, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      avatar,
      password,
    })

    logger.info('Invitation accepted successfully', {
      invitationId: result.invitation.id,
      userId: result.user.id,
      email: result.user.email,
      workspaceId: result.invitation.workspaceId,
      requiresOnboarding: result.requiresOnboarding,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        workspace: result.invitation.workspace,
        role: result.invitation.role,
        requiresOnboarding: result.requiresOnboarding,
        onboardingFlow: result.onboardingFlow,
        nextStep: result.requiresOnboarding ? 'onboarding' : 'dashboard',
      },
      message: 'Invitation accepted successfully',
    })
  } catch (error) {
    logger.error('Error accepting invitation', {
      token: new URL(request.url).searchParams.get('token'),
      error: error.message,
    })

    // Handle specific error cases
    if (error.message.includes('already accepted')) {
      return NextResponse.json(
        { error: { message: 'Invitation has already been accepted' } },
        { status: 409 }
      )
    }

    if (error.message.includes('expired')) {
      return NextResponse.json({ error: { message: 'Invitation has expired' } }, { status: 410 })
    }

    if (error.message.includes('Invalid invitation')) {
      return NextResponse.json({ error: { message: 'Invalid invitation token' } }, { status: 404 })
    }

    return NextResponse.json(
      { error: { message: error.message || 'Failed to accept invitation' } },
      { status: 500 }
    )
  }
}
