// app/api/email-templates/[templateId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/email-templates/[templateId]
 * Get specific email template details
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { templateId } = params

    // Get workspace context from cookies
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
      ['templates.view', 'templates.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view email templates' } },
        { status: 403 }
      )
    }

    // Get template details
    const template = await EmailTemplateService.findById(templateId)
    if (!template) {
      return NextResponse.json({ error: { message: 'Email template not found' } }, { status: 404 })
    }

    // Verify template belongs to current workspace
    if (template.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Email template not found in current workspace' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { template },
    })
  } catch (error) {
    logger.error('Error fetching email template', {
      templateId: params.templateId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch email template' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/email-templates/[templateId]
 * Update an email template
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { templateId } = params

    // Get workspace context from cookies
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
      'templates.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update email templates' } },
        { status: 403 }
      )
    }

    // Verify template exists and belongs to current workspace
    const existingTemplate = await EmailTemplateService.findById(templateId)
    if (!existingTemplate) {
      return NextResponse.json({ error: { message: 'Email template not found' } }, { status: 404 })
    }

    if (existingTemplate.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Email template not found in current workspace' } },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, description, type, subject, content, isActive } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: { message: 'Template name is required' } }, { status: 400 })
    }

    if (!subject?.trim()) {
      return NextResponse.json({ error: { message: 'Email subject is required' } }, { status: 400 })
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: { message: 'Email content is required' } }, { status: 400 })
    }

    // Prepare update data
    const updates = {
      name: name.trim(),
      description: description?.trim() || null,
      type: type || existingTemplate.type,
      subject: subject.trim(),
      content: content.trim(),
      isActive: isActive !== undefined ? Boolean(isActive) : existingTemplate.isActive,
    }

    // Update the template
    const updatedTemplate = await EmailTemplateService.update(templateId, updates)

    logger.info('Email template updated', {
      templateId,
      templateName: updatedTemplate.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      updatedFields: Object.keys(updates),
    })

    return NextResponse.json({
      success: true,
      data: { template: updatedTemplate },
      message: 'Email template updated successfully',
    })
  } catch (error) {
    logger.error('Error updating email template', {
      templateId: params.templateId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update email template' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/email-templates/[templateId]
 * Delete an email template
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { templateId } = params

    // Get workspace context from cookies
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
      'templates.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to delete email templates' } },
        { status: 403 }
      )
    }

    // Verify template exists and belongs to current workspace
    const template = await EmailTemplateService.findById(templateId)
    if (!template) {
      return NextResponse.json({ error: { message: 'Email template not found' } }, { status: 404 })
    }

    if (template.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Email template not found in current workspace' } },
        { status: 404 }
      )
    }

    // Check if template is system template
    if (template.isSystem) {
      return NextResponse.json(
        { error: { message: 'Cannot delete system email template' } },
        { status: 400 }
      )
    }

    // Delete the template
    await EmailTemplateService.delete(templateId)

    logger.info('Email template deleted', {
      templateId,
      templateName: template.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting email template', {
      templateId: params.templateId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete email template' } },
      { status: 500 }
    )
  }
}
