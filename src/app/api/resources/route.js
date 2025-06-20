// app/api/resources/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { ResourceService } from '@/lib/services/resource-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/resources
 * Get all resources for current workspace with filters
 */
export async function GET(request) {
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
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['resources.view', 'resources.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view resources' } },
        { status: 403 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const filters = {
      search: url.searchParams.get('search') || '',
      type: url.searchParams.get('type') || 'all',
      category: url.searchParams.get('category') || '',
      isPublic:
        url.searchParams.get('isPublic') === 'true'
          ? true
          : url.searchParams.get('isPublic') === 'false'
            ? false
            : undefined,
      eventId: url.searchParams.get('eventId') || '',
      page: parseInt(url.searchParams.get('page')) || 1,
      limit: parseInt(url.searchParams.get('limit')) || 50,
    }

    // Get resources
    const result = await ResourceService.findByWorkspace(workspaceContext.workspaceId, filters)
    console.log(result)
    logger.info('Resources fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      filters,
      resourceCount: result.resources.length,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error fetching resources', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch resources' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/resources
 * Create a new resource
 */
export async function POST(request) {
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
        { error: { message: 'Insufficient permissions to create resources' } },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const title = formData.get('title')
    const description = formData.get('description')
    const type = formData.get('type') || 'FILE'
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

    // Create the resource
    const resource = await ResourceService.create(
      workspaceContext.workspaceId,
      resourceData,
      file,
      session.user.id
    )

    logger.info('Resource created', {
      resourceId: resource.id,
      resourceTitle: resource.title,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { resource },
      message: 'Resource created successfully',
    })
  } catch (error) {
    logger.error('Error creating resource', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create resource' } },
      { status: 500 }
    )
  }
}
