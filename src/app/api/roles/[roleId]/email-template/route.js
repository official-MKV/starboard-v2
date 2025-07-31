import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

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
        { error: { message: 'Insufficient permissions to view role template' } },
        { status: 403 }
      )
    }

    const { roleId } = params

    try {
      const result = await EmailTemplateService.getTemplateVariables(
        null,
        roleId,
        workspaceContext.workspaceId
      )

      logger.info('Role template variables fetched', {
        roleId,
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        templateId: result.template?.id || 'none',
        requiredCount: result.variables.required.length,
        optionalCount: result.variables.optional.length,
      })

      return NextResponse.json({
        success: true,
        data: result,
      })
    } catch (error) {
      if (error.message === 'Role not found') {
        return NextResponse.json(
          { error: { message: 'Role not found', code: 'ROLE_NOT_FOUND' } },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    logger.error('Error fetching role template variables', {
      error: error.message,
      roleId: params.roleId,
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        error: { 
          message: 'Failed to fetch role template variables',
          code: 'TEMPLATE_FETCH_ERROR'
        } 
      },
      { status: 500 }
    )
  }
}