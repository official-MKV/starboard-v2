import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = params

    const judges = await prisma.demoDayJudge.findMany({
      where: { eventId },
      include: {
        judge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            company: true,
            jobTitle: true,
          }
        }
      },
      orderBy: [
        { isLead: 'desc' },
        { assignedAt: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: { judges }
    })

  } catch (error) {
    logger.error('Failed to fetch demo day judges', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch judges' } },
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

    const { eventId } = params
    const body = await request.json()
    const {
      judgeId,
      isLead = false,
      weight = 1.0,
      expertise = [],
      categories = [],
    } = body

    if (!judgeId) {
      return NextResponse.json(
        { error: { message: 'Judge ID is required' } },
        { status: 400 }
      )
    }

    const existingJudge = await prisma.demoDayJudge.findUnique({
      where: {
        eventId_judgeId: {
          eventId,
          judgeId,
        }
      }
    })

    if (existingJudge) {
      return NextResponse.json(
        { error: { message: 'Judge already assigned to this demo day' } },
        { status: 400 }
      )
    }

    const judge = await prisma.demoDayJudge.create({
      data: {
        eventId,
        judgeId,
        isLead,
        weight,
        expertise,
        categories,
      },
      include: {
        judge: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            company: true,
            jobTitle: true,
          }
        }
      }
    })

    logger.info('Demo day judge assigned', { eventId, judgeId, assignedBy: session.user.id })

    return NextResponse.json({
      success: true,
      data: { judge }
    })

  } catch (error) {
    logger.error('Failed to assign demo day judge', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to assign judge' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const judgeId = searchParams.get('judgeId')

    if (!judgeId) {
      return NextResponse.json(
        { error: { message: 'Judge ID is required' } },
        { status: 400 }
      )
    }

    const judge = await prisma.demoDayJudge.findUnique({
      where: {
        eventId_judgeId: {
          eventId,
          judgeId,
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Judge not found' } }, { status: 404 })
    }

    const hasScores = await prisma.judgeScore.findFirst({
      where: {
        eventId,
        judgeId,
        isComplete: true,
      }
    })

    if (hasScores) {
      return NextResponse.json(
        { error: { message: 'Cannot remove judge who has already scored submissions' } },
        { status: 400 }
      )
    }

    await prisma.demoDayJudge.delete({
      where: {
        eventId_judgeId: {
          eventId,
          judgeId,
        }
      }
    })

    await prisma.judgeScore.deleteMany({
      where: {
        eventId,
        judgeId,
      }
    })

    logger.info('Demo day judge removed', { eventId, judgeId, removedBy: session.user.id })

    return NextResponse.json({
      success: true,
      data: { message: 'Judge removed successfully' }
    })

  } catch (error) {
    logger.error('Failed to remove demo day judge', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to remove judge' } },
      { status: 500 }
    )
  }
}