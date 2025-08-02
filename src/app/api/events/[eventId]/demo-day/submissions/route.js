// app/api/events/[eventId]/demo-day/submissions/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

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
      ['events.view', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view demo day submissions' } },
        { status: 403 }
      )
    }

    // FIXED: Await params before accessing properties
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    // Verify event belongs to workspace
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    let whereClause = {
      eventId,
      event: {
        workspaceId: workspaceContext.workspaceId
      }
    }

    // FIXED: Remove isSubmitted filter as it doesn't exist in schema
    // All submissions in the database are considered "submitted"
    if (category) {
      whereClause.category = category
    }

    const submissions = await prisma.demoDaySubmission.findMany({
      where: whereClause,
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          }
        },
        resources: {
          orderBy: { order: 'asc' }
        },
        // FIXED: Remove isComplete filter and fix judge selection
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            scores: true // Count all scores, not just "complete" ones
          }
        }
      },
      orderBy: [
        { averageScore: 'desc' },
        { submittedAt: 'asc' }
      ]
    })

    // Calculate additional stats for each submission
    const submissionsWithStats = submissions.map(submission => {
      const totalJudges = submission.scores.length > 0 ? 
        [...new Set(submission.scores.map(score => score.judgeId))].length : 0
      
      const avgScore = submission.averageScore || 0
      
      return {
        ...submission,
        stats: {
          totalJudges,
          averageScore: avgScore,
          isFullyScored: totalJudges > 0 && submission._count.scores >= totalJudges
        }
      }
    })

    logger.info('Demo day submissions fetched', {
      eventId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      submissionCount: submissions.length,
      filters: { status, category }
    })

    return NextResponse.json({
      success: true,
      data: { 
        submissions: submissionsWithStats,
        totalCount: submissions.length
      }
    })

  } catch (error) {
    logger.error('Failed to fetch demo day submissions', { 
      eventId: (await params).eventId, // FIXED: Await params in error logging
      userId: session?.user?.id,
      error: error.message 
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch submissions' } },
      { status: 500 }
    )
  }
}

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

    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['demo-day.participate', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create demo day submissions' } },
        { status: 403 }
      )
    }

    // FIXED: Await params before accessing properties
    const { eventId } = await params
    const body = await request.json()
    const {
      projectTitle,
      description,
      category,
      stage,
      submissionUrl,
      resources = []
    } = body

    if (!projectTitle?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: { message: 'Project title and description are required' } },
        { status: 400 }
      )
    }

    // Verify event belongs to workspace and is demo day type
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId,
        type: 'DEMO_DAY'
      },
      include: {
        demoDayConfig: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Demo day event not found' } }, { status: 404 })
    }

    // Check if submission deadline has passed
    if (event.demoDayConfig?.submissionDeadline && 
        new Date() > new Date(event.demoDayConfig.submissionDeadline) &&
        !event.demoDayConfig.allowLateSubmissions) {
      return NextResponse.json(
        { error: { message: 'Submission deadline has passed' } },
        { status: 400 }
      )
    }

    // Check if user already has a submission for this event
    const existingSubmission = await prisma.demoDaySubmission.findFirst({
      where: {
        eventId,
        submitterId: session.user.id
      }
    })

    if (existingSubmission) {
      return NextResponse.json(
        { error: { message: 'You have already submitted to this demo day' } },
        { status: 400 }
      )
    }

    // Create submission with resources in transaction
    const submission = await prisma.$transaction(async (tx) => {
      const newSubmission = await tx.demoDaySubmission.create({
        data: {
          eventId,
          submitterId: session.user.id,
          projectTitle: projectTitle.trim(),
          description: description.trim(),
          category: category?.trim() || null,
          stage: stage?.trim() || null,
          submissionUrl: submissionUrl?.trim() || null,
        },
        include: {
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            }
          }
        }
      })

      // Create resources if provided
      if (resources && resources.length > 0) {
        await tx.demoDaySubmissionResource.createMany({
          data: resources.map((resource, index) => ({
            submissionId: newSubmission.id,
            type: resource.type,
            title: resource.title,
            url: resource.url,
            description: resource.description || null,
            order: resource.order || index
          }))
        })
      }

      return newSubmission
    })

    logger.info('Demo day submission created', {
      eventId,
      submissionId: submission.id,
      submitterId: session.user.id,
      projectTitle: submission.projectTitle,
      workspaceId: workspaceContext.workspaceId,
      resourceCount: resources.length
    })

    return NextResponse.json({
      success: true,
      data: { submission },
      message: 'Submission created successfully'
    })

  } catch (error) {
    logger.error('Failed to create demo day submission', { 
      eventId: (await params).eventId, // FIXED: Await params in error logging
      userId: session?.user?.id,
      error: error.message 
    })
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { message: 'You have already submitted to this demo day' } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { message: error.message || 'Failed to create submission' } },
      { status: 500 }
    )
  }
}