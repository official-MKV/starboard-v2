import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { DemoDayService } from '@/lib/services/demoday-service'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/database'

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
      ['events.view', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view events' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      status: searchParams.get('status') || 'all',
      date: searchParams.get('date') || 'all',
      isPublic: searchParams.get('isPublic'),
      creatorId: searchParams.get('creatorId'),
      page: parseInt(searchParams.get('page')) || 1,
      limit: parseInt(searchParams.get('limit')) || 50,
    }

    const eventsData = await EventService.findByWorkspace(workspaceContext.workspaceId, filters)

    logger.info('Events fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      eventCount: eventsData.events.length,
      filters: JSON.stringify(filters),
    })

    return NextResponse.json({
      success: true,
      data: eventsData,
    })
  } catch (error) {
    logger.error('Error fetching events', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch events' } },
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
      'events.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create events' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      location,
      virtualLink,
      isVirtual,
      isPublic,
      maxAttendees,
      bannerImage,
      waitingRoom,
      autoRecord,
      agenda,
      instructions,
      tags,
      speakers,
      accessRules,
      resources,
      timezone,
      isRecurring,
      recurringRule,
      demoDayConfig,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: { message: 'Event title is required' } }, { status: 400 })
    }

    if (!startDate) {
      return NextResponse.json({ error: { message: 'Start date is required' } }, { status: 400 })
    }

    if (!endDate) {
      return NextResponse.json({ error: { message: 'End date is required' } }, { status: 400 })
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: { message: 'End date must be after start date' } },
        { status: 400 }
      )
    }

    if (type === 'DEMO_DAY' && !demoDayConfig?.submissionDeadline) {
      return NextResponse.json(
        { error: { message: 'Demo day submission deadline is required' } },
        { status: 400 }
      )
    }

    const eventData = {
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'WORKSHOP',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location: location?.trim() || null,
      isVirtual: Boolean(isVirtual),
      isPublic: Boolean(isPublic),
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      bannerImage: bannerImage?.trim() || null,
      waitingRoom: Boolean(waitingRoom),
      autoRecord: Boolean(autoRecord),
      agenda: agenda?.trim() || null,
      instructions: instructions?.trim() || null,
      tags: Array.isArray(tags) ? tags.filter(tag => tag?.trim()) : [],
      timezone: timezone || 'UTC',
      isRecurring: Boolean(isRecurring),
      recurringRule: isRecurring ? recurringRule : null,
      speakers: Array.isArray(speakers) ? speakers : [],
      accessRules: Array.isArray(accessRules) ? accessRules : [],
      resources: Array.isArray(resources) ? resources : [],
      virtualLink: null,
    }

    let event

    if (type === 'DEMO_DAY') {
      event = await prisma.$transaction(async (tx) => {
        const createdEvent = await EventService.create(
          workspaceContext.workspaceId,
          eventData,
          session.user.id,
          tx
        )

        const demoDayConfigData = {
          eventId: createdEvent.id,
          submissionDeadline: new Date(demoDayConfig.submissionDeadline),
          allowLateSubmissions: Boolean(demoDayConfig.allowLateSubmissions),
          maxTeamSize: parseInt(demoDayConfig.maxTeamSize) || 5,
          maxPitchDuration: parseInt(demoDayConfig.maxPitchDuration) || 5,
          requireVideo: Boolean(demoDayConfig.requireVideo),
          requirePresentation: Boolean(demoDayConfig.requirePresentation),
          requireDemo: Boolean(demoDayConfig.requireDemo),
          requireBusinessPlan: Boolean(demoDayConfig.requireBusinessPlan),
          judgingStartTime: demoDayConfig.judgingStartTime ? new Date(demoDayConfig.judgingStartTime) : null,
          judgingEndTime: demoDayConfig.judgingEndTime ? new Date(demoDayConfig.judgingEndTime) : null,
          scoringCriteria: demoDayConfig.scoringCriteria || {},
          maxScore: parseInt(demoDayConfig.maxScore) || 50,
          showResultsLive: Boolean(demoDayConfig.showResultsLive),
          resultsPublicAt: demoDayConfig.resultsPublicAt ? new Date(demoDayConfig.resultsPublicAt) : null,
          showJudgeNames: Boolean(demoDayConfig.showJudgeNames),
          showDetailedScores: Boolean(demoDayConfig.showDetailedScores),
          description: demoDayConfig.description?.trim() || null,
        }

        const config = await tx.demoDayConfig.create({
          data: demoDayConfigData
        })

        const eventWithConfig = await tx.event.findUnique({
          where: { id: createdEvent.id },
          include: {
            demoDayConfig: true,
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              }
            },
            speakers: true,
            _count: {
              select: {
                registrations: true,
                demoDaySubmissions: true,
              }
            }
          }
        })

        return eventWithConfig
      })

      logger.info('Demo day event created', {
        eventId: event.id,
        eventTitle: event.title,
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        submissionDeadline: demoDayConfig.submissionDeadline,
        criteriaCount: Object.keys(demoDayConfig.scoringCriteria || {}).length,
      })
    } else {
      event = await EventService.create(
        workspaceContext.workspaceId,
        eventData,
        session.user.id
      )

      logger.info('Event created', {
        eventId: event.id,
        eventTitle: event.title,
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        isPublic: event.isPublic,
        isVirtual: event.virtualLink ? true : false,
      })
    }

    return NextResponse.json({
      success: true,
      data: { event },
      message: `${type === 'DEMO_DAY' ? 'Demo day' : 'Event'} created successfully`,
    })
  } catch (error) {
    logger.error('Error creating event', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create event' } },
      { status: 500 }
    )
  }
}