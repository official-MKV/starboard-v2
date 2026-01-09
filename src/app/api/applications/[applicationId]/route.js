import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { applicationService } from '@/lib/services/application'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const { applicationId } = await params
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('GET', `/api/applications/${applicationId}`, 400)
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
      timer.log('GET', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('GET', `/api/applications/${applicationId}`, session.user.id)

    const application = await applicationService.findById(applicationId)

    if (!application) {
      timer.log('GET', `/api/applications/${applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    // Check if application belongs to user's workspace
    if (application.workspaceId !== workspaceContext.workspaceId) {
      timer.log('GET', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Get application stats
    const stats = await applicationService.getApplicationStats(applicationId)

    // Transform the data to match what the frontend expects
    const responseData = {
      ...application,
      submissionCount: stats.totalSubmissions,
      stats: {
        totalSubmissions: stats.totalSubmissions,
        pendingReviews: stats.statusBreakdown?.SUBMITTED || 0,
        accepted: stats.statusBreakdown?.ACCEPTED || 0,
        rejected: stats.statusBreakdown?.REJECTED || 0,
        averageScore: stats.averageScore || 0,
        submissionsByDate: stats.submissionsByDate || [],
      },
      // Since there's no creator relation, provide a fallback
      creator: {
        id: session.user.id,
        firstName: session.user.firstName || 'Unknown',
        lastName: session.user.lastName || 'User',
        email: session.user.email,
      },
    }

    timer.log('GET', `/api/applications/${applicationId}`, 200, session.user.id)

    return NextResponse.json({ application: responseData })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}`, error, session?.user?.id)
    timer.log('GET', `/api/applications/${applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch application' } },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const { applicationId } = await params
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', `/api/applications/${applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('PUT', `/api/applications/${applicationId}`, 400)
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
      timer.log('PUT', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('PUT', `/api/applications/${applicationId}`, session.user.id)

    // Parse request body
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error('Failed to parse request body', {
        userId: session.user.id,
        error: parseError.message,
      })
      timer.log('PUT', `/api/applications/${applicationId}`, 400, session.user.id)
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    // Handle form fields separately if provided
    const formFields = requestBody.formFields
    const updateData = { ...requestBody }
    delete updateData.formFields // Remove from main data

    // Sanitize numeric fields - convert empty strings to null
    if (updateData.maxSubmissions === '' || updateData.maxSubmissions === undefined) {
      updateData.maxSubmissions = null
    } else if (updateData.maxSubmissions) {
      updateData.maxSubmissions = parseInt(updateData.maxSubmissions, 10)
      if (isNaN(updateData.maxSubmissions)) {
        updateData.maxSubmissions = null
      }
    }

    // Convert date strings to Date objects if provided
    if (updateData.openDate) {
      try {
        updateData.openDate = new Date(updateData.openDate)
        if (isNaN(updateData.openDate.getTime())) {
          throw new Error('Invalid date')
        }
      } catch (dateError) {
        logger.error('Invalid openDate format', {
          userId: session.user.id,
          openDate: updateData.openDate,
        })
        timer.log('PUT', `/api/applications/${applicationId}`, 400, session.user.id)
        return NextResponse.json({ error: { message: 'Invalid openDate format' } }, { status: 400 })
      }
    }

    if (updateData.closeDate) {
      try {
        updateData.closeDate = new Date(updateData.closeDate)
        if (isNaN(updateData.closeDate.getTime())) {
          throw new Error('Invalid date')
        }
      } catch (dateError) {
        logger.error('Invalid closeDate format', {
          userId: session.user.id,
          closeDate: updateData.closeDate,
        })
        timer.log('PUT', `/api/applications/${applicationId}`, 400, session.user.id)
        return NextResponse.json(
          { error: { message: 'Invalid closeDate format' } },
          { status: 400 }
        )
      }
    }

    // Validate date logic
    if (
      updateData.openDate &&
      updateData.closeDate &&
      updateData.closeDate <= updateData.openDate
    ) {
      logger.warn('Close date before open date', {
        userId: session.user.id,
        openDate: updateData.openDate,
        closeDate: updateData.closeDate,
      })
      timer.log('PUT', `/api/applications/${applicationId}`, 400, session.user.id)
      return NextResponse.json(
        { error: { message: 'Close date must be after open date' } },
        { status: 400 }
      )
    }

    // Check if application exists and belongs to workspace
    const existingApplication = await applicationService.findById(applicationId)
    if (!existingApplication) {
      timer.log('PUT', `/api/applications/${applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    if (existingApplication.workspaceId !== workspaceContext.workspaceId) {
      timer.log('PUT', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Update the application
    let updatedApplication = await applicationService.update(applicationId, updateData)

    // Update form fields if provided
    if (formFields !== undefined) {
      updatedApplication = await applicationService.updateFormFields(applicationId, formFields)
    }

    logger.info('Application updated successfully', {
      userId: session.user.id,
      applicationId: applicationId,
      title: updatedApplication.title,
      workspaceId: workspaceContext.workspaceId, // Use workspaceContext instead of application
    })

    timer.log('PUT', `/api/applications/${applicationId}`, 200, session.user.id)

    return NextResponse.json({ application: updatedApplication })
  } catch (error) {
    logger.apiError('PUT', `/api/applications/${applicationId}`, error, session?.user?.id, {
      // Only log essential request data to avoid circular references
      title: requestBody?.title,
      description: requestBody?.description?.substring(0, 100),
      hasFormFields: Array.isArray(requestBody?.formFields),
    })
    timer.log('PUT', `/api/applications/${applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update application' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const { applicationId } = await params
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('DELETE', `/api/applications/${applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('DELETE', `/api/applications/${applicationId}`, 400)
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'applications.delete'
    )

    if (!hasPermission) {
      timer.log('DELETE', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to delete application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('DELETE', `/api/applications/${applicationId}`, session.user.id)

    // Check if application exists and belongs to workspace
    const existingApplication = await applicationService.findById(applicationId)
    if (!existingApplication) {
      timer.log('DELETE', `/api/applications/${applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    if (existingApplication.workspaceId !== workspaceContext.workspaceId) {
      timer.log('DELETE', `/api/applications/${applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Delete the application
    await applicationService.delete(applicationId)

    logger.info('Application deleted successfully', {
      userId: session.user.id,
      applicationId: applicationId,
      workspaceId: workspaceContext.workspaceId,
    })

    timer.log('DELETE', `/api/applications/${applicationId}`, 200, session.user.id)

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    logger.apiError('DELETE', `/api/applications/${applicationId}`, error, session?.user?.id)
    timer.log('DELETE', `/api/applications/${applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete application' } },
      { status: 500 }
    )
  }
}
