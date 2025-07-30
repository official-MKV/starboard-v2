import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = params

    const stats = await DemoDayService.getDemoDayStats(eventId)

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        demoDayConfig: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    const categoryStats = await prisma.demoDaySubmission.groupBy({
      by: ['category'],
      where: {
        eventId,
        isSubmitted: true,
        category: { not: null }
      },
      _count: {
        category: true
      }
    })

    const scoreDistribution = await prisma.demoDaySubmission.findMany({
      where: {
        eventId,
        isSubmitted: true,
        averageScore: { not: null }
      },
      select: {
        averageScore: true
      }
    })

    const topSubmissions = await prisma.demoDaySubmission.findMany({
      where: {
        eventId,
        isSubmitted: true,
        averageScore: { not: null }
      },
      select: {
        id: true,
        teamName: true,
        projectTitle: true,
        averageScore: true,
        rank: true,
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      },
      orderBy: [
        { averageScore: 'desc' },
        { submittedAt: 'asc' }
      ],
      take: 5
    })

   const judgeProgress = await prisma.demoDayJudge.findMany({
  where: { eventId },
  include: {
    judge: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      }
    }
  }
})
 
const judgeProgressWithCounts = await Promise.all(
  judgeProgress.map(async (jp) => {
    const completedScores = await prisma.judgeScore.count({
      where: {
        judgeId: jp.judgeId,
        eventId: eventId,
        isComplete: true
      }
    })
    
    return {
      judge: jp.judge,
      completedScores,
      isLead: jp.isLead,
      weight: jp.weight,
    }
  })
)
    const responseData = {
      ...stats,
      categoryBreakdown: categoryStats.map(cat => ({
        category: cat.category,
        count: cat._count.category
      })),
      scoreDistribution: {
        scores: scoreDistribution.map(s => s.averageScore),
        average: scoreDistribution.length > 0 
          ? scoreDistribution.reduce((sum, s) => sum + s.averageScore, 0) / scoreDistribution.length
          : 0,
        highest: Math.max(...scoreDistribution.map(s => s.averageScore), 0),
        lowest: Math.min(...scoreDistribution.map(s => s.averageScore), 0),
      },
      topSubmissions,
      judgeProgress: judgeProgress.map(jp => ({
        judge: jp.judge,
        completedScores: jp._count.event,
        isLead: jp.isLead,
        weight: jp.weight,
      })),
      eventInfo: {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        submissionDeadline: event.demoDayConfig?.submissionDeadline,
        judgingStartTime: event.demoDayConfig?.judgingStartTime,
        judgingEndTime: event.demoDayConfig?.judgingEndTime,
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error('Failed to fetch demo day stats', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch stats' } },
      { status: 500 }
    )
  }
}