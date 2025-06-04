// app/api/invitations/details/route.js - NEW ENDPOINT
import { NextResponse } from 'next/server'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/invitations/details?token=xxx
 * Get invitation details by token (public endpoint) using query parameter
 */
export async function GET(request) {
  try {
    // Extract token from query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Invitation token is required as query parameter' } },
        { status: 400 }
      )
    }

    const invitation = await InvitationService.findByToken(token)

    if (!invitation) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired invitation' } },
        { status: 404 }
      )
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: { message: 'Invitation has expired' } },
        { status: 410 } // Gone
      )
    }

    // Check if already accepted
    if (invitation.isAccepted) {
      return NextResponse.json(
        { error: { message: 'Invitation has already been accepted' } },
        { status: 409 } // Conflict
      )
    }

    // Determine onboarding form source (could be from role or direct onboarding flow)
    let onboardingForm = null
    if (invitation.role?.requiresOnboarding) {
      onboardingForm = invitation.role.onboardingForm || invitation.onboardingFlow
    }

    // Return safe invitation data (no sensitive info)
    return NextResponse.json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          personalMessage: invitation.personalMessage,
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
            description: invitation.workspace.description,
            logo: invitation.workspace.logo,
          },
          role: {
            id: invitation.role.id,
            name: invitation.role.name,
            description: invitation.role.description,
            color: invitation.role.color,
            requiresOnboarding: invitation.role.requiresOnboarding,
          },
          requiresOnboarding: invitation.role.requiresOnboarding,
          onboardingForm: onboardingForm
            ? {
                id: onboardingForm.id,
                name: onboardingForm.name,
                description: onboardingForm.description,
                fields: onboardingForm.fields || [],
                requireTermsAccept: onboardingForm.requireTermsAccept,
                termsAndConditions: onboardingForm.termsAndConditions,
                settings: onboardingForm.settings,
              }
            : null,
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching invitation', {
      token: new URL(request.url).searchParams.get('token'),
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch invitation details' } },
      { status: 500 }
    )
  }
}
