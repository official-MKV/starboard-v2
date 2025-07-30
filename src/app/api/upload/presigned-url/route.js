// app/api/upload/presigned-url/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { awsService } from '@/lib/services/aws-service'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileType, folder = 'uploads' } = body

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: { message: 'fileName and fileType are required' } },
        { status: 400 }
      )
    }

    const validation = awsService.validateFile(fileName, fileType, 0)
    if (!validation.valid) {
      return NextResponse.json(
        { error: { message: `File validation failed: ${validation.errors.join(', ')}` } },
        { status: 400 }
      )
    }

    const presignedData = await awsService.getPresignedUploadUrl(
      fileName,
      fileType,
      folder,
      session.user.id
    )

    // Fix: Return uploadUrl to match what the frontend expects
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: presignedData.presignedUrl, // ✅ Map presignedUrl to uploadUrl
        fileUrl: presignedData.fileUrl,
        fileKey: presignedData.fileKey,
        fileName: presignedData.fileName,
        originalName: presignedData.originalName,
      },
    })
  } catch (error) {
    logger.error('Failed to generate presigned URL', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { error: { message: 'Failed to generate upload URL' } },
      { status: 500 }
    )
  }
}