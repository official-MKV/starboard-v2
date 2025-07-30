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

    const { submissionId } = params

    const submission = await prisma.demoDaySubmission.findUnique({
      where: { id: submissionId },
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
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
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

    return NextResponse.json({
      success: true,
      data: { submission }
    })

  } catch (error) {
    logger.error('Failed to fetch demo day submission', { submissionId: params.submissionId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch submission' } },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { submissionId } = params
    const body = await request.json()

    const submission = await prisma.demoDaySubmission.findFirst({
      where: { 
        id: submissionId, 
        submitterId: session.user.id 
      }
    })

    if (!submission) {
      return NextResponse.json({ error: { message: 'Submission not found' } }, { status: 404 })
    }

    if (submission.isSubmitted) {
      return NextResponse.json({ error: { message: 'Cannot modify submitted entry' } }, { status: 400 })
    }

    const updatedSubmission = await prisma.demoDaySubmission.update({
      where: { id: submissionId },
      data: {
        ...body,
        updatedAt: new Date(),
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
        },
        resources: {
          orderBy: { order: 'asc' }
        }
      }
    })

    logger.info('Demo day submission updated', { submissionId, userId: session.user.id })

    return NextResponse.json({
      success: true,
      data: { submission: updatedSubmission }
    })

  } catch (error) {
    logger.error('Failed to update demo day submission', { submissionId: params.submissionId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to update submission' } },
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

    const { submissionId } = params

    const submission = await prisma.demoDaySubmission.findFirst({
      where: { 
        id: submissionId, 
        submitterId: session.user.id 
      }
    })

    if (!submission) {
      return NextResponse.json({ error: { message: 'Submission not found' } }, { status: 404 })
    }

    if (submission.isSubmitted) {
      return NextResponse.json({ error: { message: 'Cannot delete submitted entry' } }, { status: 400 })
    }

    await prisma.demoDaySubmission.delete({
      where: { id: submissionId }
    })

    logger.info('Demo day submission deleted', { submissionId, userId: session.user.id })

    return NextResponse.json({
      success: true,
      data: { message: 'Submission deleted successfully' }
    })

  } catch (error) {
    logger.error('Failed to delete demo day submission', { submissionId: params.submissionId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to delete submission' } },
      { status: 500 }
    )
  }
}