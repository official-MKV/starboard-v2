// app/api/email-templates/[templateId]/duplicate/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/email-templates/[templateId]/duplicate
 * Duplicate an email template with a new name
 */
export async function POST(request, { params }) {
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
        { error: { message: 'Insufficient permissions to duplicate email templates' } },
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
    const { name } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: { message: 'New template name is required' } },
        { status: 400 }
      )
    }

    // Prepare duplicated template data
    const templateData = {
      name: name.trim(),
      description: existingTemplate.description
        ? `${existingTemplate.description} (Copy)`
        : 'Duplicated template',
      type: existingTemplate.type,
      subject: existingTemplate.subject,
      content: existingTemplate.content,
      isActive: false, // Start as inactive by default
    }

    // Create the duplicated template
    const duplicatedTemplate = await EmailTemplateService.create(
      workspaceContext.workspaceId,
      templateData,
      session.user.id
    )

    logger.info('Email template duplicated', {
      originalTemplateId: templateId,
      duplicatedTemplateId: duplicatedTemplate.id,
      originalTemplateName: existingTemplate.name,
      newTemplateName: duplicatedTemplate.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { template: duplicatedTemplate },
      message: 'Email template duplicated successfully',
    })
  } catch (error) {
    logger.error('Error duplicating email template', {
      templateId: params.templateId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to duplicate email template' } },
      { status: 500 }
    )
  }
}
