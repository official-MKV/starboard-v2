// app/api/upload/complete/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awsService } from '@/lib/services/aws-service'
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

 