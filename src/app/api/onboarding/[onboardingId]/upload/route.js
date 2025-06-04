// app/api/onboarding/[onboardingId]/upload/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedOnboardingService } from '@/lib/services/onboarding'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function POST(request, { params }) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()
    const { onboardingId } = params

    if (!session?.user?.id) {
      timer.log('POST', `/api/onboarding/${onboardingId}/upload`, 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('POST', `/api/onboarding/${onboardingId}/upload`, session.user.id)

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file')
    const fieldName = formData.get('fieldName')
    const completionId = formData.get('completionId')
    const fieldConfig = JSON.parse(formData.get('fieldConfig') || '{}')

    if (!file) {
      timer.log('POST', `/api/onboarding/${onboardingId}/upload`, 400, session.user.id)
      return apiError('No file provided', 400)
    }

    if (!fieldName || !completionId) {
      timer.log('POST', `/api/onboarding/${onboardingId}/upload`, 400, session.user.id)
      return apiError('Field name and completion ID are required', 400)
    }

    // Convert File to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileData = {
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
      buffer: buffer,
    }

    // Handle file upload through service
    const uploadedFile = await enhancedOnboardingService.handleFileUpload(
      fileData,
      fieldName,
      completionId,
      fieldConfig
    )

    logger.info('Onboarding file uploaded', {
      fileId: uploadedFile.id,
      fieldName,
      completionId,
      userId: session.user.id,
    })

    timer.log('POST', `/api/onboarding/${onboardingId}/upload`, 201, session.user.id)
    return apiResponse(
      {
        file: {
          id: uploadedFile.id,
          url: uploadedFile.fileUrl,
          name: uploadedFile.originalName,
          size: uploadedFile.fileSize,
          type: uploadedFile.mimeType,
        },
        message: 'File uploaded successfully',
      },
      201
    )
  } catch (error) {
    logger.apiError('POST', `/api/onboarding/${onboardingId}/upload`, error, session?.user?.id)
    timer.log('POST', `/api/onboarding/${onboardingId}/upload`, 500, session?.user?.id)
    return handleApiError(error)
  }
}

// app/api/onboarding/[onboardingId]/progress/route.js (Enhanced)
import { enhancedOnboardingService } from '@/lib/services/enhanced-onboarding'
import { z } from 'zod'

const updateProgressSchema = z.object({
  stepIndex: z.number().min(0),
  stepData: z.record(z.any()).default({}),
  files: z
    .array(
      z.object({
        fieldName: z.string(),
        file: z.any(),
      })
    )
    .optional(),
})

export async function GET(request, { params }) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()
    const { onboardingId } = params

    if (!session?.user?.id) {
      timer.log('GET', `/api/onboarding/${onboardingId}/progress`, 401)
      return apiError('Authentication required', 401)
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      timer.log('GET', `/api/onboarding/${onboardingId}/progress`, 400, session.user.id)
      return apiError('Workspace ID is required', 400)
    }

    // Get or start onboarding progress
    let progress = await enhancedOnboardingService.getUserProgress(session.user.id, workspaceId)
    progress = progress.find(p => p.onboardingId === onboardingId)

    if (!progress) {
      progress = await enhancedOnboardingService.startOnboarding(
        session.user.id,
        onboardingId,
        workspaceId
      )
    }

    timer.log('GET', `/api/onboarding/${onboardingId}/progress`, 200, session.user.id)
    return apiResponse({ progress })
  } catch (error) {
    logger.apiError('GET', `/api/onboarding/${onboardingId}/progress`, error, session?.user?.id)
    timer.log('GET', `/api/onboarding/${onboardingId}/progress`, 500, session?.user?.id)
    return handleApiError(error)
  }
}

export async function PUT(request, { params }) {
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()
    const { onboardingId } = params

    if (!session?.user?.id) {
      timer.log('PUT', `/api/onboarding/${onboardingId}/progress`, 401)
      return apiError('Authentication required', 401)
    }

    try {
      requestBody = await request.json()
    } catch (parseError) {
      timer.log('PUT', `/api/onboarding/${onboardingId}/progress`, 400, session.user.id)
      return apiError('Invalid JSON in request body', 400)
    }

    const validation = updateProgressSchema.safeParse(requestBody)
    if (!validation.success) {
      timer.log('PUT', `/api/onboarding/${onboardingId}/progress`, 400, session.user.id)
      return apiError('Validation failed', 400, {
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors,
      })
    }

    const { stepIndex, stepData } = validation.data

    const progress = await enhancedOnboardingService.updateProgress(
      session.user.id,
      onboardingId,
      stepIndex,
      stepData
    )

    logger.info('Enhanced onboarding progress updated', {
      userId: session.user.id,
      onboardingId,
      stepIndex,
      isCompleted: progress.isCompleted,
    })

    timer.log('PUT', `/api/onboarding/${onboardingId}/progress`, 200, session.user.id)
    return apiResponse({
      progress,
      message: progress.isCompleted ? 'Onboarding completed!' : 'Progress updated successfully',
    })
  } catch (error) {
    logger.apiError(
      'PUT',
      `/api/onboarding/${onboardingId}/progress`,
      error,
      session?.user?.id,
      requestBody
    )
    timer.log('PUT', `/api/onboarding/${onboardingId}/progress`, 500, session?.user?.id)
    return handleApiError(error)
  }
}

// app/api/workspaces/[workspaceId]/onboarding/field-types/route.js
export async function GET(request, { params }) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()
    const { workspaceId } = params

    if (!session?.user?.id) {
      timer.log('GET', `/api/workspaces/${workspaceId}/onboarding/field-types`, 401)
      return apiError('Authentication required', 401)
    }

    // Check workspace access
    const hasAccess = session.user.workspaces?.some(ws => ws.id === workspaceId)
    if (!hasAccess) {
      timer.log(
        'GET',
        `/api/workspaces/${workspaceId}/onboarding/field-types`,
        403,
        session.user.id
      )
      return apiError('Access denied to workspace', 403)
    }

    const profileFieldTypes = enhancedOnboardingService.getProfileFieldTypes()
    const stepTypes = enhancedOnboardingService.getOnboardingStepTypes()

    timer.log('GET', `/api/workspaces/${workspaceId}/onboarding/field-types`, 200, session.user.id)
    return apiResponse({
      profileFieldTypes,
      stepTypes,
    })
  } catch (error) {
    logger.apiError(
      'GET',
      `/api/workspaces/${workspaceId}/onboarding/field-types`,
      error,
      session?.user?.id
    )
    timer.log(
      'GET',
      `/api/workspaces/${workspaceId}/onboarding/field-types`,
      500,
      session?.user?.id
    )
    return handleApiError(error)
  }
}

// app/api/users/profile/route.js (Enhanced profile management)
import { userService } from '@/lib/services/user-management'

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedIn: z.string().url().optional().or(z.literal('')),
  twitter: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  profileData: z.record(z.any()).optional(), // Custom profile fields
})

export async function GET(request) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', '/api/users/profile', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('GET', '/api/users/profile', session.user.id)

    const profile = await userService.findById(session.user.id)
    if (!profile) {
      timer.log('GET', '/api/users/profile', 404, session.user.id)
      return apiError('Profile not found', 404)
    }

    timer.log('GET', '/api/users/profile', 200, session.user.id)
    return apiResponse({ profile })
  } catch (error) {
    logger.apiError('GET', '/api/users/profile', error, session?.user?.id)
    timer.log('GET', '/api/users/profile', 500, session?.user?.id)
    return handleApiError(error)
  }
}

export async function PUT(request) {
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', '/api/users/profile', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('PUT', '/api/users/profile', session.user.id)

    try {
      requestBody = await request.json()
    } catch (parseError) {
      timer.log('PUT', '/api/users/profile', 400, session.user.id)
      return apiError('Invalid JSON in request body', 400)
    }

    const validation = updateProfileSchema.safeParse(requestBody)
    if (!validation.success) {
      timer.log('PUT', '/api/users/profile', 400, session.user.id)
      return apiError('Validation failed', 400, {
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors,
      })
    }

    const updatedProfile = await prisma.user.update({
      where: { id: session.user.id },
      data: validation.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        bio: true,
        location: true,
        address: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedIn: true,
        twitter: true,
        timezone: true,
        language: true,
        profileData: true,
        isOnboardingCompleted: true,
        updatedAt: true,
      },
    })

    logger.info('User profile updated', {
      userId: session.user.id,
      updatedFields: Object.keys(validation.data),
    })

    timer.log('PUT', '/api/users/profile', 200, session.user.id)
    return apiResponse({
      profile: updatedProfile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    logger.apiError('PUT', '/api/users/profile', error, session?.user?.id, requestBody)
    timer.log('PUT', '/api/users/profile', 500, session?.user?.id)
    return handleApiError(error)
  }
}

// app/api/users/profile/avatar/route.js (Profile image upload)
export async function POST(request) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('POST', '/api/users/profile/avatar', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('POST', '/api/users/profile/avatar', session.user.id)

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('avatar')

    if (!file) {
      timer.log('POST', '/api/users/profile/avatar', 400, session.user.id)
      return apiError('No file provided', 400)
    }

    // Validate image file
    if (!file.type.startsWith('image/')) {
      timer.log('POST', '/api/users/profile/avatar', 400, session.user.id)
      return apiError('File must be an image', 400)
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      timer.log('POST', '/api/users/profile/avatar', 400, session.user.id)
      return apiError('File size must be less than 5MB', 400)
    }

    // Convert to buffer and upload
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadFileToS3(buffer, file.name, file.type, 'avatars')

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: uploadResult.fileUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    })

    logger.info('User avatar updated', {
      userId: session.user.id,
      avatarUrl: uploadResult.fileUrl,
    })

    timer.log('POST', '/api/users/profile/avatar', 201, session.user.id)
    return apiResponse(
      {
        user: updatedUser,
        avatarUrl: uploadResult.fileUrl,
        message: 'Avatar updated successfully',
      },
      201
    )
  } catch (error) {
    logger.apiError('POST', '/api/users/profile/avatar', error, session?.user?.id)
    timer.log('POST', '/api/users/profile/avatar', 500, session?.user?.id)
    return handleApiError(error)
  }
}

// app/api/onboarding/files/[fileId]/route.js (File management)
export async function DELETE(request, { params }) {
  const timer = createRequestTimer()
  let session = null

  try {
    session = await auth()
    const { fileId } = params

    if (!session?.user?.id) {
      timer.log('DELETE', `/api/onboarding/files/${fileId}`, 401)
      return apiError('Authentication required', 401)
    }

    // Find file and verify ownership
    const file = await prisma.onboardingFile.findUnique({
      where: { id: fileId },
      include: {
        completion: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!file) {
      timer.log('DELETE', `/api/onboarding/files/${fileId}`, 404, session.user.id)
      return apiError('File not found', 404)
    }

    if (file.completion.userId !== session.user.id) {
      timer.log('DELETE', `/api/onboarding/files/${fileId}`, 403, session.user.id)
      return apiError('Access denied', 403)
    }

    // Delete from S3
    await deleteFileFromS3(file.fileName)

    // Delete from database
    await prisma.onboardingFile.delete({
      where: { id: fileId },
    })

    logger.info('Onboarding file deleted', {
      fileId,
      userId: session.user.id,
    })

    timer.log('DELETE', `/api/onboarding/files/${fileId}`, 200, session.user.id)
    return apiResponse({ message: 'File deleted successfully' })
  } catch (error) {
    logger.apiError('DELETE', `/api/onboarding/files/${fileId}`, error, session?.user?.id)
    timer.log('DELETE', `/api/onboarding/files/${fileId}`, 500, session?.user?.id)
    return handleApiError(error)
  }
}
