import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/database'
import { DemoDayService } from '@/lib/services/demoday-service'

export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { submissionId } = await params
    const body = await request.json()
    const {
      feedback,
      notes,
      isComplete = false,
      totalScore,
      ...criteriaScores
    } = body

    const submission = await prisma.demoDaySubmission.findUnique({
      where: { id: submissionId },
      include: {
        event: {
          include: {
            demoDayConfig: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: { message: 'Submission not found' } }, { status: 404 })
    }

    // Check if user is a judge for this event
    const judge = await prisma.eventJudge.findUnique({
      where: {
        eventId_userId: {
          eventId: submission.eventId,
          userId: session.user.id,
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Not authorized to judge this submission' } }, { status: 403 })
    }

    const scoringCriteria = submission.event.demoDayConfig?.scoringCriteria || {
      innovation: 20,
      execution: 20,
      marketSize: 20,
      team: 20,
      presentation: 20
    }

    const validatedScores = {}
    let calculatedWeightedTotal = 0

    for (const [criteriaKey, weight] of Object.entries(scoringCriteria)) {
      const rawScore = criteriaScores[criteriaKey]
      
      if (rawScore === undefined || rawScore === null) {
        return NextResponse.json(
          { error: { message: `Score for ${criteriaKey} is required` } },
          { status: 400 }
        )
      }

      if (rawScore < 1 || rawScore > 10) {
        return NextResponse.json(
          { error: { message: `Score for ${criteriaKey} must be between 1 and 10` } },
          { status: 400 }
        )
      }

      validatedScores[criteriaKey] = rawScore
      calculatedWeightedTotal += rawScore * weight
    }

    const maxPossibleScore = Object.values(scoringCriteria).reduce((sum, weight) => sum + (10 * weight), 0)
    const normalizedScore = (calculatedWeightedTotal / maxPossibleScore) * 100
    const finalTotalScore = totalScore || Math.round(normalizedScore * 100) / 100

    // Create or update the score using the correct model and judgeId
    const scoreData = {
      submissionId,
      judgeId: judge.id, // Use EventJudge.id, not User.id
      criteriaScores: validatedScores,
      totalScore: finalTotalScore,
      feedback: feedback || null,
    }

    const score = await prisma.demoDayScore.upsert({
      where: {
        submissionId_judgeId: {
          submissionId,
          judgeId: judge.id
        }
      },
      update: scoreData,
      create: scoreData,
      include: {
        judge: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        submission: {
          select: {
            id: true,
            projectTitle: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { score }
    })

  } catch (error) {
    const { submissionId } = await params
    logger.error('Failed to score demo day submission', { 
      submissionId, 
      error: error.message,
      stack: error.stack 
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to score submission' } },
      { status: 500 }
    )
  }
}

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { submissionId } = await params

    // Find the submission to get the eventId
    const submission = await prisma.demoDaySubmission.findUnique({
      where: { id: submissionId },
      select: { eventId: true }
    })

    if (!submission) {
      return NextResponse.json({ error: { message: 'Submission not found' } }, { status: 404 })
    }

    // Find the judge record for this user and event
    const judge = await prisma.eventJudge.findUnique({
      where: {
        eventId_userId: {
          eventId: submission.eventId,
          userId: session.user.id,
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Not authorized to judge this submission' } }, { status: 403 })
    }

    // Find the score using the correct judge ID
    const score = await prisma.demoDayScore.findUnique({
      where: {
        submissionId_judgeId: {
          submissionId,
          judgeId: judge.id,
        }
      },
      include: {
        judge: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        submission: {
          select: {
            id: true,
            projectTitle: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: { score }
    })

  } catch (error) {
    const { submissionId } = await params
    logger.error('Failed to fetch score', { 
      submissionId, 
      error: error.message 
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch score' } },
      { status: 500 }
    )
  }
}