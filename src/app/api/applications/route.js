import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const numberOrString = z
  .union([
    z.number(),
    z.string().transform(val => {
      const parsed = parseInt(val, 10)
      return isNaN(parsed) ? undefined : parsed
    }),
  ])
  .optional()

const createApplicationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  isActive: z.union([z.boolean(), z.string().transform(val => val === 'true')]).default(true),
  isPublic: z.union([z.boolean(), z.string().transform(val => val === 'true')]).default(true),
  openDate: z.string().optional(),
  closeDate: z.string().optional(),
  maxSubmissions: numberOrString,
  allowMultipleSubmissions: z
    .union([z.boolean(), z.string().transform(val => val === 'true')])
    .default(false),
  requireAuthentication: z
    .union([z.boolean(), z.string().transform(val => val === 'true')])
    .default(false),
  reviewerInstructions: z.string().optional(),
  formFields: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        label: z.string(),
        description: z.string().optional(),
        placeholder: z.string().optional(),
        required: z
          .union([z.boolean(), z.string().transform(val => val === 'true')])
          .default(false),
        order: numberOrString.default(0),
        section: z.string().optional(),
        options: z.any().optional(),
        minLength: numberOrString,
        maxLength: numberOrString,
        minValue: numberOrString,
        maxValue: numberOrString,
        allowedFileTypes: z.array(z.string()).optional(),
        maxFileSize: numberOrString,
        maxFiles: numberOrString,
        isVisible: z
          .union([z.boolean(), z.string().transform(val => val === 'true')])
          .default(true),
        isConditional: z
          .union([z.boolean(), z.string().transform(val => val === 'true')])
          .default(false),
      })
    )
    .default([]),
})

export async function GET(request) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', '/api/applications', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('GET', '/api/applications', session.user.id)

    const { searchParams } = new URL(request.url)
    const specificWorkspaceId = searchParams.get('workspaceId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Get user's workspaces from session
    const userWorkspaces = session.user.workspaces || []

    if (userWorkspaces.length === 0) {
      timer.log('GET', '/api/applications', 200, session.user.id)
      return apiResponse({ applications: [] })
    }

    let applications = []

    if (specificWorkspaceId) {
      // Check if user has access to specific workspace
      const hasAccess = userWorkspaces.some(ws => ws.id === specificWorkspaceId)
      if (!hasAccess) {
        timer.log('GET', '/api/applications', 403, session.user.id)
        return apiError('Access denied to workspace', 403)
      }

      applications = await applicationService.findByWorkspace(specificWorkspaceId, {
        includeInactive,
        page,
        limit,
      })
    } else {
      const workspaceIds = userWorkspaces.map(ws => ws.id)

      for (const workspaceId of workspaceIds) {
        const workspaceApps = await applicationService.findByWorkspace(workspaceId, {
          includeInactive,
          page: 1,
          limit: 1000,
        })
        applications.push(...workspaceApps)
      }

      // Sort by creation date and apply pagination
      applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      // Apply pagination
      const startIndex = (page - 1) * limit
      applications = applications.slice(startIndex, startIndex + limit)
    }

    timer.log('GET', '/api/applications', 200, session.user.id)

    return apiResponse({ applications })
  } catch (error) {
    logger.apiError('GET', '/api/applications', error, session?.user?.id)
    timer.log('GET', '/api/applications', 500, session?.user?.id)
    return handleApiError(error)
  }
}

export async function POST(request) {
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('POST', '/api/applications', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('POST', '/api/applications', session.user.id)

    // Parse request body
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error('Failed to parse request body', {
        userId: session.user.id,
        error: parseError.message,
      })
      timer.log('POST', '/api/applications', 400, session.user.id)
      return apiError('Invalid JSON in request body', 400)
    }

    // Validate request data
    const validation = createApplicationSchema.safeParse(requestBody)
    console.log('Validation result:', validation)

    if (!validation.success) {
      logger.error('Validation failed', {
        userId: session.user.id,
        errors: validation.error.errors,
        body: requestBody,
      })
      timer.log('POST', '/api/applications', 400, session.user.id)
      return apiError('Validation failed', 400, {
        code: 'VALIDATION_ERROR',
        errors: validation.error.errors,
      })
    }

    const data = validation.data

    // Convert date strings to Date objects if provided
    if (data.openDate) {
      try {
        data.openDate = new Date(data.openDate)
        if (isNaN(data.openDate.getTime())) {
          throw new Error('Invalid date')
        }
      } catch (dateError) {
        logger.error('Invalid openDate format', {
          userId: session.user.id,
          openDate: data.openDate,
        })
        timer.log('POST', '/api/applications', 400, session.user.id)
        return apiError('Invalid openDate format', 400)
      }
    }

    if (data.closeDate) {
      try {
        data.closeDate = new Date(data.closeDate)
        if (isNaN(data.closeDate.getTime())) {
          throw new Error('Invalid date')
        }
      } catch (dateError) {
        logger.error('Invalid closeDate format', {
          userId: session.user.id,
          closeDate: data.closeDate,
        })
        timer.log('POST', '/api/applications', 400, session.user.id)
        return apiError('Invalid closeDate format', 400)
      }
    }

    // Validate date logic
    if (data.openDate && data.closeDate && data.closeDate <= data.openDate) {
      logger.warn('Close date before open date', {
        userId: session.user.id,
        openDate: data.openDate,
        closeDate: data.closeDate,
      })
      timer.log('POST', '/api/applications', 400, session.user.id)
      return apiError('Close date must be after open date', 400)
    }

    // Create the application
    logger.info('Creating application', {
      userId: session.user.id,
      workspaceId: data.workspaceId,
      title: data.title,
      formFieldsCount: data.formFields?.length || 0,
    })

    const application = await applicationService.create(data)

    logger.info('Application created successfully', {
      userId: session.user.id,
      applicationId: application.id,
      title: application.title,
      workspaceId: application.workspaceId,
    })

    timer.log('POST', '/api/applications', 201, session.user.id)

    return apiResponse({ application }, 201)
  } catch (error) {
    logger.apiError('POST', '/api/applications', error, session?.user?.id, requestBody)
    timer.log('POST', '/api/applications', 500, session?.user?.id)
    return handleApiError(error)
  }
}
