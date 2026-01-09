import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { applicationService } from '@/lib/services/application'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const formFieldSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string().min(1, 'Label is required'),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number().default(0),
  section: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  maxFiles: z.number().optional(),
  isVisible: z.boolean().default(true),
  isConditional: z.boolean().default(false),
})

const updateFormFieldsSchema = z.object({
  formFields: z.array(formFieldSchema),
})

export async function PUT(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const { applicationId } = await params
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 400)
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
      timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update application form fields' } },
        { status: 403 }
      )
    }

    logger.apiRequest(
      'PUT',
      `/api/applications/${applicationId}/form-fields`,
      session.user.id
    )

    // Parse request body
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error('Failed to parse request body', {
        userId: session.user.id,
        error: parseError.message,
      })
      timer.log(
        'PUT',
        `/api/applications/${applicationId}/form-fields`,
        400,
        session.user.id
      )
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    // Validate request data
    const validation = updateFormFieldsSchema.safeParse(requestBody)

    if (!validation.success) {
      logger.error('Validation failed', {
        userId: session.user.id,
        errors: validation.error.errors,
        body: requestBody,
      })
      timer.log(
        'PUT',
        `/api/applications/${applicationId}/form-fields`,
        400,
        session.user.id
      )
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

    const { formFields } = validation.data

    // Check if application exists and belongs to workspace
    const existingApplication = await applicationService.findById(applicationId)
    if (!existingApplication) {
      timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    if (existingApplication.workspaceId !== workspaceContext.workspaceId) {
      timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Update form fields
    const updatedApplication = await applicationService.updateFormFields(
      applicationId,
      formFields
    )

    logger.info('Application form fields updated successfully', {
      userId: session.user.id,
      applicationId: applicationId,
      fieldCount: formFields.length,
      workspaceId: workspaceContext.workspaceId,
    })

    timer.log('PUT', `/api/applications/${applicationId}/form-fields`, 200, session.user.id)

    return NextResponse.json({ application: updatedApplication })
  } catch (error) {
    logger.apiError(
      'PUT',
      `/api/applications/${applicationId}/form-fields`,
      error,
      session?.user?.id,
      requestBody
    )
    timer.log(
      'PUT',
      `/api/applications/${applicationId}/form-fields`,
      500,
      session?.user?.id
    )
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update form fields' } },
      { status: 500 }
    )
  }
}

export async function GET(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const { applicationId } = await params
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${applicationId}/form-fields`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('GET', `/api/applications/${applicationId}/form-fields`, 400)
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
      timer.log('GET', `/api/applications/${applicationId}/form-fields`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view application form fields' } },
        { status: 403 }
      )
    }

    logger.apiRequest(
      'GET',
      `/api/applications/${applicationId}/form-fields`,
      session.user.id
    )

    const application = await applicationService.findById(applicationId)

    if (!application) {
      timer.log('GET', `/api/applications/${applicationId}/form-fields`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    // Check if application belongs to user's workspace
    if (application.workspaceId !== workspaceContext.workspaceId) {
      timer.log('GET', `/api/applications/${applicationId}/form-fields`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    timer.log('GET', `/api/applications/${applicationId}/form-fields`, 200, session.user.id)

    return NextResponse.json({ formFields: application.formFields || [] })
  } catch (error) {
    logger.apiError(
      'GET',
      `/api/applications/${applicationId}/form-fields`,
      error,
      session?.user?.id
    )
    timer.log(
      'GET',
      `/api/applications/${applicationId}/form-fields`,
      500,
      session?.user?.id
    )
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch form fields' } },
      { status: 500 }
    )
  }
}
