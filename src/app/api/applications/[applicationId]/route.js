import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { applicationService } from '@/lib/services/application'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request, { params }) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${params.applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('GET', `/api/applications/${params.applicationId}`, 400)
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
      timer.log('GET', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('GET', `/api/applications/${params.applicationId}`, session.user.id)

    const application = await applicationService.findById(params.applicationId)

    if (!application) {
      timer.log('GET', `/api/applications/${params.applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    // Check if application belongs to user's workspace
    if (application.workspaceId !== workspaceContext.workspaceId) {
      timer.log('GET', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Get application stats
    const stats = await applicationService.getApplicationStats(params.applicationId)

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
      creator: application.creator || {
        id: session.user.id,
        firstName: session.user.firstName || 'Unknown',
        lastName: session.user.lastName || 'User',
        email: session.user.email,
      },
    }

    timer.log('GET', `/api/applications/${params.applicationId}`, 200, session.user.id)

    return NextResponse.json({ application: responseData })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${params.applicationId}`, error, session?.user?.id)
    timer.log('GET', `/api/applications/${params.applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch application' } },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  const timer = createRequestTimer()
  let session = null
  let requestBody = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', `/api/applications/${params.applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('PUT', `/api/applications/${params.applicationId}`, 400)
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
      timer.log('PUT', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('PUT', `/api/applications/${params.applicationId}`, session.user.id)

    // Parse request body
    try {
      requestBody = await request.json()
    } catch (parseError) {
      logger.error('Failed to parse request body', {
        userId: session.user.id,
        error: parseError.message,
      })
      timer.log('PUT', `/api/applications/${params.applicationId}`, 400, session.user.id)
      return NextResponse.json(
        { error: { message: 'Invalid JSON in request body' } },
        { status: 400 }
      )
    }

    // Check if application exists and belongs to workspace
    const existingApplication = await applicationService.findById(params.applicationId)
    if (!existingApplication) {
      timer.log('PUT', `/api/applications/${params.applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    if (existingApplication.workspaceId !== workspaceContext.workspaceId) {
      timer.log('PUT', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Update the application
    const updatedApplication = await applicationService.update(params.applicationId, requestBody)

    logger.info('Application updated successfully', {
      userId: session.user.id,
      applicationId: params.applicationId,
      title: updatedApplication.title,
      workspaceId: updatedApplication.workspaceId,
    })

    timer.log('PUT', `/api/applications/${params.applicationId}`, 200, session.user.id)

    return NextResponse.json({ application: updatedApplication })
  } catch (error) {
    logger.apiError(
      'PUT',
      `/api/applications/${params.applicationId}`,
      error,
      session?.user?.id,
      requestBody
    )
    timer.log('PUT', `/api/applications/${params.applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update application' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('DELETE', `/api/applications/${params.applicationId}`, 401)
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      timer.log('DELETE', `/api/applications/${params.applicationId}`, 400)
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
      timer.log('DELETE', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to delete application' } },
        { status: 403 }
      )
    }

    logger.apiRequest('DELETE', `/api/applications/${params.applicationId}`, session.user.id)

    // Check if application exists and belongs to workspace
    const existingApplication = await applicationService.findById(params.applicationId)
    if (!existingApplication) {
      timer.log('DELETE', `/api/applications/${params.applicationId}`, 404)
      return NextResponse.json({ error: { message: 'Application not found' } }, { status: 404 })
    }

    if (existingApplication.workspaceId !== workspaceContext.workspaceId) {
      timer.log('DELETE', `/api/applications/${params.applicationId}`, 403)
      return NextResponse.json(
        { error: { message: 'Access denied to this application' } },
        { status: 403 }
      )
    }

    // Delete the application
    await applicationService.delete(params.applicationId)

    logger.info('Application deleted successfully', {
      userId: session.user.id,
      applicationId: params.applicationId,
      workspaceId: workspaceContext.workspaceId,
    })

    timer.log('DELETE', `/api/applications/${params.applicationId}`, 200, session.user.id)

    return NextResponse.json({ message: 'Application deleted successfully' })
  } catch (error) {
    logger.apiError('DELETE', `/api/applications/${params.applicationId}`, error, session?.user?.id)
    timer.log('DELETE', `/api/applications/${params.applicationId}`, 500, session?.user?.id)
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete application' } },
      { status: 500 }
    )
  }
}
