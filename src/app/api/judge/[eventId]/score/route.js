 
// Submit scores for a submission (with proper auth and workspace context)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

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

    const { eventId } = params
    const body = await request.json()
    const { 
      judgeId, 
      submissionId, 
      criteriaScores, // {"Innovation": 8.5, "Market Opportunity": 7.0, etc.}
      feedback 
    } = body

    if (!judgeId || !submissionId || !criteriaScores) {
      return NextResponse.json(
        { error: { message: 'Judge ID, submission ID, and criteria scores are required' } },
        { status: 400 }
      )
    }

    // Verify judge has access and is the authenticated user
    const judge = await prisma.eventJudge.findFirst({
      where: {
        id: judgeId,
        eventId: eventId,
        userId: session.user.id, // Ensure the authenticated user is the judge
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        event: {
          include: {
            demoDayConfig: true,
            workspace: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Access denied - Invalid judge credentials' } }, { status: 403 })
    }

    // Check judge permissions
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['events.judge', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to submit scores' } },
        { status: 403 }
      )
    }

    // Verify submission belongs to this event and workspace
    const submission = await prisma.demoDaySubmission.findFirst({
      where: {
        id: submissionId,
        eventId: eventId,
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      },
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: { message: 'Submission not found' } }, { status: 404 })
    }

    // Get scoring criteria and validate scores
    const scoringCriteria = judge.event.demoDayConfig.scoringCriteria
    const maxScore = judge.event.demoDayConfig.maxScore || 10

    // Validate that all required criteria are scored
    const requiredCriteria = Object.keys(scoringCriteria)
    const providedCriteria = Object.keys(criteriaScores)
    
    for (const criterion of requiredCriteria) {
      if (!providedCriteria.includes(criterion) || criteriaScores[criterion] === null || criteriaScores[criterion] === undefined) {
        return NextResponse.json(
          { error: { message: `Missing score for criterion: ${criterion}` } },
          { status: 400 }
        )
      }
      
      // Validate score range
      const score = parseFloat(criteriaScores[criterion])
      if (isNaN(score) || score < 0 || score > maxScore) {
        return NextResponse.json(
          { error: { message: `Invalid score for ${criterion}. Must be between 0 and ${maxScore}` } },
          { status: 400 }
        )
      }
    }

    // Calculate weighted total score
    let weightedTotal = 0
    let totalWeight = 0
    
    for (const [criterion, weight] of Object.entries(scoringCriteria)) {
      const score = parseFloat(criteriaScores[criterion])
      const criterionWeight = parseFloat(weight)
      
      // Calculate weighted contribution: (score / maxScore) * weight
      weightedTotal += (score / maxScore) * criterionWeight
      totalWeight += criterionWeight
    }

    // Create or update score
    const score = await prisma.demoDayScore.upsert({
      where: {
        submissionId_judgeId: {
          submissionId,
          judgeId
        }
      },
      update: {
        criteriaScores,
        totalScore: weightedTotal,
        feedback: feedback?.trim() || null
      },
      create: {
        submissionId,
        judgeId,
        criteriaScores,
        totalScore: weightedTotal,
        feedback: feedback?.trim() || null
      },
      include: {
        judge: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Check if judge has completed scoring all submissions
    const totalSubmissions = await prisma.demoDaySubmission.count({
      where: { 
        eventId,
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      }
    })
    
    const judgeScoreCount = await prisma.demoDayScore.count({
      where: { 
        judgeId,
        submission: {
          eventId,
          event: {
            workspaceId: workspaceContext.workspaceId
          }
        }
      }
    })

    if (judgeScoreCount >= totalSubmissions) {
      await prisma.eventJudge.update({
        where: { id: judgeId },
        data: { status: 'COMPLETED' }
      })
    }

    logger.info('Judge score submitted', {
      eventId,
      judgeId: judge.id,
      judgeName: `${judge.user.firstName} ${judge.user.lastName}`,
      submissionId,
      submitterName: `${submission.submitter.firstName} ${submission.submitter.lastName}`,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      totalScore: weightedTotal,
      progress: {
        completed: judgeScoreCount,
        total: totalSubmissions
      }
    })

    return NextResponse.json({
      success: true,
      data: { 
        score,
        progress: {
          completed: judgeScoreCount,
          total: totalSubmissions,
          isComplete: judgeScoreCount >= totalSubmissions
        }
      },
      message: 'Score submitted successfully'
    })

  } catch (error) {
    logger.error('Score submission error', {
      eventId: params.eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to submit score' } },
      { status: 500 }
    )
  }
}
