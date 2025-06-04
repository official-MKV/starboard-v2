export async function POST(request) {
  try {
    const body = await request.json()
    const { files, folder = 'public-uploads', invitationToken, source = 'unknown' } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: { message: 'Files array is required' } }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: { message: 'Maximum 10 files allowed per batch upload' } },
        { status: 400 }
      )
    }

    let userId = null

    // Validate invitation token if provided
    if (invitationToken) {
      const invitation = await prisma.userInvitation.findUnique({
        where: {
          token: invitationToken,
          isAccepted: false,
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

      userId = `invitation_${invitation.email.replace(/[^a-zA-Z0-9]/g, '_')}`
    } else {
      userId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Validate all files with public restrictions
    const publicFileRestrictions = {
      maxSize: 10 * 1024 * 1024,
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

    for (const file of files) {
      if (!file.fileName || !file.fileType) {
        return NextResponse.json(
          { error: { message: 'Each file must have fileName and fileType' } },
          { status: 400 }
        )
      }

      const validation = awsService.validateFile(
        file.fileName,
        file.fileType,
        0,
        publicFileRestrictions
      )
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: {
              message: `File ${file.fileName} validation failed: ${validation.errors.join(', ')}`,
            },
          },
          { status: 400 }
        )
      }
    }

    const presignedData = await awsService.getBatchPresignedUrls(files, folder, userId)

    logger.info('Public batch presigned URLs generated', {
      filesCount: files.length,
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
    logger.error('Failed to generate public batch presigned URLs', {
      error: error.message,
      filesCount: body?.files?.length,
      source: body?.source,
    })

    return NextResponse.json(
      { error: { message: 'Failed to generate upload URLs' } },
      { status: 500 }
    )
  }
}
