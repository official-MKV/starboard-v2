// app/api/chat/upload/route.js - File upload for direct messages
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { WorkspaceContext } from '@/lib/workspace-context'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json({ error: 'Workspace context required' }, { status: 403 })
    }

    const { fileName, fileType, fileSize } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'File name and type required' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (fileSize > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      // Videos (for small clips)
      'video/mp4',
      'video/webm',
      'video/quicktime',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ]

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Generate unique file name
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileName.split('.').pop()
    const uniqueFileName = `chat-files/${workspaceContext.workspaceId}/${session.user.id}/${timestamp}-${randomString}.${fileExtension}`

    // Generate presigned URL for upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
      Metadata: {
        'uploaded-by': session.user.id,
        'workspace-id': workspaceContext.workspaceId,
        'original-name': fileName,
        'upload-type': 'chat-message',
      },
    })

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600, // 1 hour
    })

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`

    // Generate thumbnail URL for images
    let thumbnailUrl = null
    if (fileType.startsWith('image/')) {
      // You can implement image resizing with AWS Lambda or CloudFront
      thumbnailUrl = `${fileUrl}?w=300&h=300&fit=cover` // Placeholder for thumbnail service
    }

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      thumbnailUrl,
      fileName: uniqueFileName,
      originalName: fileName,
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
