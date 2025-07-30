// app/api/upload/multipart/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awsService } from '@/lib/aws-service'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const body = await request.json()
    const { uploadId, totalChunks } = body

    if (!uploadId || !totalChunks) {
      return NextResponse.json(
        { error: { message: 'uploadId and totalChunks are required' } },
        { status: 400 }
      )
    }

    const uploadUrls = await awsService.getMultipartUploadUrls(uploadId, totalChunks)

    return NextResponse.json({
      success: true,
      data: { uploadUrls }
    })

  } catch (error) {
    logger.error('Failed to generate multipart URLs', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to generate multipart URLs' } },
      { status: 500 }
    )
  }
}

// app/api/upload/complete/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awsService } from '@/lib/aws-service'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const body = await request.json()
    const { uploadId, parts } = body

    if (!uploadId || !parts) {
      return NextResponse.json(
        { error: { message: 'uploadId and parts are required' } },
        { status: 400 }
      )
    }

    const result = await awsService.completeMultipartUpload(uploadId, parts)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    logger.error('Failed to complete multipart upload', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to complete upload' } },
      { status: 500 }
    )
  }
}