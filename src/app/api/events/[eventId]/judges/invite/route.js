import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EmailService } from '@/lib/services/email-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function POST(request, { params }) {
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
      'events.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to invite judges' } },
        { status: 403 }
      )
    }

    const { eventId } = params
    const body = await request.json()
    const { judges, personalMessage } = body

    if (!Array.isArray(judges) || judges.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one judge is required' } },
        { status: 400 }
      )
    }

    // Verify event belongs to workspace
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId
      },
      include: {
        workspace: {
          select: {
            name: true,
            logo: true
          }
        },
        demoDayConfig: {
          select: {
            judgingStartTime: true,
            judgingEndTime: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    const invitedJudges = []
    const errors = []

    for (const judgeData of judges) {
      try {
        const { email, firstName, lastName, isExternal = false } = judgeData

        if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
          errors.push(`Invalid judge data: ${email || 'missing email'}`)
          continue
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() }
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase().trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              role: isExternal ? 'JUDGE' : 'USER',
              isExternal: isExternal
            }
          })
        }

        // Create judge invitation
        const judge = await prisma.eventJudge.create({
          data: {
            eventId,
            userId: user.id,
            isExternal,
            status: 'INVITED'
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })

        // Create judge access URL
        const judgeUrl = `${process.env.NEXTAUTH_URL}/judge/${eventId}?judge=${judge.id}`

        // Format judging period
        let judgingPeriod = 'Available now'
        if (event.demoDayConfig?.judgingStartTime && event.demoDayConfig?.judgingEndTime) {
          const startDate = new Date(event.demoDayConfig.judgingStartTime).toLocaleDateString()
          const endDate = new Date(event.demoDayConfig.judgingEndTime).toLocaleDateString()
          judgingPeriod = `${startDate} - ${endDate}`
        }

        // Prepare invitation email
        const invitationTemplate = {
          subject: `You're invited to judge {{event_title}}`,
          content: `Hello {{judge_name}},

You've been invited to judge submissions for **{{event_title}}**.

**Event Date:** {{event_date}}
**Judging Period:** {{judging_period}}

{{#if personal_message}}
**Message from organizer:**
{{personal_message}}
{{/if}}

Click the link below to access the judging interface:
{{judge_url}}

If you have any questions, please contact the event organizer.

Thank you for your participation!`,
          type: 'JUDGE_INVITATION'
        }

        const emailVariables = {
          workspace_name: event.workspace.name,
          workspace_logo: event.workspace.logo,
          judge_name: `${user.firstName} ${user.lastName}`,
          event_title: event.title,
          event_date: new Date(event.startDate).toLocaleDateString(),
          judging_period: judgingPeriod,
          judge_url: judgeUrl,
          personal_message: personalMessage?.trim() || ''
        }

        // Send invitation email
        await EmailService.sendTemplatedEmail(
          invitationTemplate,
          emailVariables,
          user.email
        )

        invitedJudges.push({
          judge,
          emailSent: true
        })

      } catch (error) {
        errors.push(`Failed to invite ${judgeData.email}: ${error.message}`)
        logger.error('Individual judge invitation failed', {
          email: judgeData.email,
          error: error.message
        })
      }
    }

    logger.info('Judges invited to event', {
      eventId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      invitedBy: session.user.id,
      successCount: invitedJudges.length,
      errorCount: errors.length,
      judges: invitedJudges.map(j => ({
        name: `${j.judge.user.firstName} ${j.judge.user.lastName}`,
        email: j.judge.user.email
      }))
    })

    return NextResponse.json({
      success: true,
      data: {
        invited: invitedJudges,
        errors
      },
      message: `Successfully invited ${invitedJudges.length} judge(s)${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    })

  } catch (error) {
    logger.error('Judge invitation error', {
      eventId: params.eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to invite judges' } },
      { status: 500 }
    )
  }
}