import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
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
  // Removed workspaceId from schema since it comes from context now
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
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('GET', '/api/applications', 400)
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['applications.view', 'applications.manage']
    )

    if (!hasPermission) {
      timer.log('GET', '/api/applications', 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view applications' } },
        { status: 403 }
      )
    }

    logger.apiRequest('GET', '/api/applications', session.user.id)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Use workspace from context instead of session
    const applications = await applicationService.findByWorkspace(workspaceContext.workspaceId, {
      includeInactive,
      page,
      limit,
    })

    timer.log('GET', '/api/applications', 200, session.user.id)

    return NextResponse.json({ applications })
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
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('POST', '/api/applications', 400)
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'applications.manage'
    )

    if (!hasPermission) {
      timer.log('POST', '/api/applications', 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create applications' } },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
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
      return NextResponse.json(
        {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: validation.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Add workspace ID from context instead of request body
    data.workspaceId = workspaceContext.workspaceId

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
        return NextResponse.json({ error: { message: 'Invalid openDate format' } }, { status: 400 })
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
        return NextResponse.json(
          { error: { message: 'Invalid closeDate format' } },
          { status: 400 }
        )
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
      return NextResponse.json(
        { error: { message: 'Close date must be after open date' } },
        { status: 400 }
      )
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
