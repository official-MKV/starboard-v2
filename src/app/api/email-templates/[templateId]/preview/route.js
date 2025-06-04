// app/api/email-templates/[templateId]/preview/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/email-templates/[templateId]/preview
 * Generate a preview of an email template with sample data
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
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['templates.view', 'templates.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to preview email templates' } },
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

    // Parse request body for custom variables (optional)
    const body = await request.json().catch(() => ({}))
    const customVariables = body.variables || {}

    // Default sample data for preview
    const defaultVariables = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      workspace_name: workspaceContext.workspace.name || 'Your Workspace',
      inviter_name: `${session.user.firstName || 'Admin'} ${session.user.lastName || 'User'}`,
      invitation_link: 'https://example.com/invitations/sample-token',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      message: 'We are excited to have you join our team!',
    }

    // Merge default and custom variables
    const variables = { ...defaultVariables, ...customVariables }

    // Generate preview using the email template service
    const preview = await EmailTemplateService.generatePreview(template, variables)

    logger.info('Email template preview generated', {
      templateId,
      templateName: template.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        preview: {
          subject: preview.subject,
          content: preview.content,
          html: preview.html, // If HTML rendering is available
        },
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
        },
        variables: variables,
      },
    })
  } catch (error) {
    logger.error('Error generating email template preview', {
      templateId: params.templateId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate email template preview' } },
      { status: 500 }
    )
  }
}
