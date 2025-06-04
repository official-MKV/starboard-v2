import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { awsService } from '@/lib/services/aws-service'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      fileName,
      fileType,
      folder = 'public-uploads',
      invitationToken,
      source = 'unknown',
    } = body

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: { message: 'fileName and fileType are required' } },
        { status: 400 }
      )
    }

    let userId = null

    if (invitationToken) {
      const invitation = await prisma.userInvitation.findUnique({
        where: {
          token: invitationToken,

          expiresAt: { gt: new Date() },
        },
        select: { email: true, workspaceId: true },
      })

      if (!invitation) {
        return NextResponse.json(
          { error: { message: 'Invalid or expired invitation token' } },
          { status: 400 }
        )
      }

      // Use invitation info for file organization
      userId = `invitation_${invitation.email.replace(/[^a-zA-Z0-9]/g, '_')}`

      logger.info('Public upload with valid invitation token', {
        invitationToken,
        email: invitation.email,
        workspaceId: invitation.workspaceId,
      })
    } else {
      // Generate temporary ID for truly public uploads
      userId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      logger.info('Public upload without invitation token', {
        source,
        tempUserId: userId,
      })
    }

    // Validate file (more restrictive for public uploads)
    const publicFileRestrictions = {
      maxSize: 10 * 1024 * 1024, // 10MB limit for public uploads
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
      ],
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv'],
    }

    const validation = awsService.validateFile(fileName, fileType, 0, publicFileRestrictions)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { message: `File validation failed: ${validation.errors.join(', ')}` } },
        { status: 400 }
      )
    }

    const presignedData = await awsService.getPresignedUploadUrl(fileName, fileType, folder, userId)

    logger.info('Public presigned URL generated', {
      fileName,
      fileType,
      folder,
      userId,
      hasInvitationToken: !!invitationToken,
      source,
    })

    return NextResponse.json({
      success: true,
      data: presignedData,
    })
  } catch (error) {
    logger.error('Failed to generate public presigned URL', {
      error: error.message,
      fileName: body?.fileName,
      source: body?.source,
    })

    return NextResponse.json(
      { error: { message: 'Failed to generate upload URL' } },
      { status: 500 }
    )
  }
}
