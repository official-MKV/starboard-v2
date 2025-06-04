// app/api/email-templates/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailTemplateService } from '@/lib/services/email-template-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/email-templates
 * Get all email templates for current workspace
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

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

    // Get URL search params for filtering
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // INVITATION, WELCOME, REMINDER, etc.
    const active = searchParams.get('active') // true, false

    // Get templates for workspace
    const templates = await EmailTemplateService.findByWorkspace(workspaceContext.workspaceId, {
      type,
      isActive: active === 'true' ? true : active === 'false' ? false : undefined,
    })

    logger.info('Email templates fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      templateCount: templates.length,
      filters: { type, active },
    })

    return NextResponse.json({
      success: true,
      data: { templates },
    })
  } catch (error) {
    logger.error('Error fetching email templates', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch email templates' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/email-templates
 * Create a new email template
 */
export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

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
        { error: { message: 'Insufficient permissions to create email templates' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, description, type = 'INVITATION', subject, content, isActive = true } = body

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

    // Create template data
    const templateData = {
      name: name.trim(),
      description: description?.trim() || null,
      type,
      subject: subject.trim(),
      content: content.trim(),
      isActive: Boolean(isActive),
    }

    // Create the template
    const template = await EmailTemplateService.create(
      workspaceContext.workspaceId,
      templateData,
      session.user.id
    )

    logger.info('Email template created', {
      templateId: template.id,
      templateName: template.name,
      templateType: template.type,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { template },
      message: 'Email template created successfully',
    })
  } catch (error) {
    logger.error('Error creating email template', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create email template' } },
      { status: 500 }
    )
  }
}
