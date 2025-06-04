import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/email-templates/[templateId]/variables
 * Get variables for a specific email template
 */
export async function GET(request, { params }) {
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
      ['users.invite', 'users.manage', 'email_templates.view']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view template variables' } },
        { status: 403 }
      )
    }

    const { templateId } = params

    // Get template and extract variables
    const template = await EmailTemplateService.findById(templateId)
    if (!template) {
      return NextResponse.json({ error: { message: 'Template not found' } }, { status: 404 })
    }

    // Check if template belongs to current workspace
    if (template.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json({ error: { message: 'Template not found' } }, { status: 404 })
    }

    // Get variable info with metadata
    const variableInfo = EmailTemplateService.getVariableInfo(template.content)

    // Filter out built-in variables that are automatically provided
    const builtInVariables = [
      'workspace_name',
      'workspace_logo',
      'inviter_name',
      'invitation_link',
      'expiry_date',
      'role_name',
      'first_name',
      'last_name',
      'email',
    ]

    const filteredVariables = variableInfo.filter(
      variable => !builtInVariables.includes(variable.name)
    )

    // Separate required and optional
    const required = filteredVariables.filter(v => v.required)
    const optional = filteredVariables.filter(v => !v.required)

    // Add personal_message as optional if not already present
    const hasPersonalMessage = filteredVariables.some(v => v.name === 'personal_message')
    if (!hasPersonalMessage) {
      optional.push({
        name: 'personal_message',
        label: 'Personal Message',
        type: 'textarea',
        required: false,
        placeholder: 'Add a personal note to the invitation',
        description: 'This will be included in the {{personal_message}} variable',
      })
    }

    const result = {
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        type: template.type,
      },
      variables: {
        required,
        optional,
      },
      builtInVariables: builtInVariables.map(name => ({
        name,
        label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Automatically provided by the system`,
      })),
    }

    logger.info('Template variables fetched', {
      templateId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      requiredCount: required.length,
      optionalCount: optional.length,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error fetching template variables', {
      error: error.message,
      templateId: params.templateId,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch template variables' } },
      { status: 500 }
    )
  }
}
