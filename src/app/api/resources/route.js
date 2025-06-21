import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { ResourceService } from '@/lib/services/resource-service'
import { logger } from '@/lib/logger'

export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

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

    const result = await ResourceService.findByWorkspace(workspaceContext.workspaceId, filters)

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

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

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

    const contentType = request.headers.get('content-type')

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      const title = formData.get('title')
      const description = formData.get('description') || ''
      const category = formData.get('category') || ''
      const isPublic = formData.get('isPublic') === 'true'
      const tagsString = formData.get('tags') || '[]'

      if (!file || !title) {
        return NextResponse.json(
          { error: { message: 'File and title are required' } },
          { status: 400 }
        )
      }

      let tags = []
      try {
        tags = JSON.parse(tagsString)
      } catch (e) {
        tags = []
      }

      const resourceData = {
        title: title.toString(),
        description: description.toString(),
        category: category.toString(),
        isPublic,
        tags: Array.isArray(tags) ? tags : [],
      }

      const resource = await ResourceService.create(
        workspaceContext.workspaceId,
        resourceData,
        file,
        session.user.id
      )

      logger.info('Small file resource created', {
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        resourceId: resource.id,
        fileName: file.name,
        fileSize: file.size,
      })

      return NextResponse.json({
        success: true,
        data: { resource },
      })
    } else if (contentType?.includes('application/json')) {
      const body = await request.json()

      if (body.type === 'direct_upload') {
        const { resourceData, uploadedFileData } = body

        if (!resourceData || !uploadedFileData) {
          return NextResponse.json(
            { error: { message: 'Resource data and uploaded file data are required' } },
            { status: 400 }
          )
        }

        if (!resourceData.title || !uploadedFileData.fileUrl) {
          return NextResponse.json(
            { error: { message: 'Title and file URL are required' } },
            { status: 400 }
          )
        }

        const resource = await ResourceService.createFromDirectUpload(
          workspaceContext.workspaceId,
          {
            title: resourceData.title,
            description: resourceData.description || '',
            category: resourceData.category || '',
            isPublic: Boolean(resourceData.isPublic),
            tags: Array.isArray(resourceData.tags) ? resourceData.tags : [],
          },
          {
            fileUrl: uploadedFileData.fileUrl,
            fileName: uploadedFileData.fileName,
            fileSize: uploadedFileData.fileSize,
            mimeType: uploadedFileData.mimeType,
          },
          session.user.id
        )

        logger.info('Large file resource created', {
          workspaceId: workspaceContext.workspaceId,
          userId: session.user.id,
          resourceId: resource.id,
          fileName: uploadedFileData.fileName,
          fileSize: uploadedFileData.fileSize,
        })

        return NextResponse.json({
          success: true,
          data: { resource },
        })
      }

      return NextResponse.json({ error: { message: 'Invalid request type' } }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: {
          message: 'Invalid content type. Expected multipart/form-data or application/json',
        },
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error creating resource', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to create resource' } },
      { status: 500 }
    )
  }
}
