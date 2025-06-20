// app/api/resources/[resourceId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { ResourceService } from '@/lib/services/resource-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/resources/[resourceId]
 * Get single resource by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { resourceId } = params

    // Get the resource
    const resource = await ResourceService.findById(resourceId, session.user.id)

    logger.info('Resource fetched', {
      resourceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { resource },
    })
  } catch (error) {
    logger.error('Error fetching resource', {
      resourceId: params.resourceId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Resource not found' } },
      { status: error.message === 'Resource not found' ? 404 : 500 }
    )
  }
}

/**
 * PUT /api/resources/[resourceId]
 * Update resource
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'resources.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update resources' } },
        { status: 403 }
      )
    }

    const { resourceId } = params

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title')
    const description = formData.get('description')
    const type = formData.get('type')
    const isPublic = formData.get('isPublic') === 'true'
    const tags = JSON.parse(formData.get('tags') || '[]')
    const category = formData.get('category') || ''

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: { message: 'Resource title is required' } },
        { status: 400 }
      )
    }

    // Create resource data
    const resourceData = {
      title: title.trim(),
      description: description?.trim() || null,
      type,
      isPublic,
      tags,
      category: category?.trim() || null,
    }

    // Update the resource
    const resource = await ResourceService.update(resourceId, resourceData, file, session.user.id)

    logger.info('Resource updated', {
      resourceId,
      resourceTitle: resource.title,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { resource },
      message: 'Resource updated successfully',
    })
  } catch (error) {
    logger.error('Error updating resource', {
      resourceId: params.resourceId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update resource' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/resources/[resourceId]
 * Delete resource
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'resources.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to delete resources' } },
        { status: 403 }
      )
    }

    const { resourceId } = params

    // Check if user has access to this specific resource
    const hasAccess = await ResourceService.checkResourceAccess(resourceId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json(
        { error: { message: 'Access denied to this resource' } },
        { status: 403 }
      )
    }

    // Delete the resource
    await ResourceService.delete(resourceId, session.user.id)

    logger.info('Resource deleted', {
      resourceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting resource', {
      resourceId: params.resourceId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete resource' } },
      { status: 500 }
    )
  }
}
