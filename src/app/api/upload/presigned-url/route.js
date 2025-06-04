// app/api/upload/route.js
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

    // Optional: get workspace context if needed
    // const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    // if (!workspaceContext) {
    //   return NextResponse.json(
    //     { error: { message: 'Workspace context required' } },
    //     { status: 400 }
    //   )
    // }

    // Optional: permission check
    // const hasPermission = await WorkspaceContext.hasPermission(
    //   session.user.id,
    //   workspaceContext.workspaceId,
    //   'files.upload'
    // )
    // if (!hasPermission) {
    //   return NextResponse.json(
    //     { error: { message: 'Insufficient permissions to upload files' } },
    //     { status: 403 }
    //   )
    // }

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

    return NextResponse.json({
      success: true,
      data: presignedData,
    })
  } catch (error) {
    logger.error('Failed to generate presigned URL', {
      error: error.message,
    })

    return NextResponse.json(
      { error: { message: 'Failed to generate upload URL' } },
      { status: 500 }
    )
  }
}
