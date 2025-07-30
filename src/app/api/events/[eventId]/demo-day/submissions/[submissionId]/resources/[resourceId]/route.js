import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { resourceId } = params
    const body = await request.json()

    const resource = await prisma.demoDayResource.findUnique({
      where: { id: resourceId },
      include: {
        submission: true
      }
    })

    if (!resource) {
      return NextResponse.json({ error: { message: 'Resource not found' } }, { status: 404 })
    }

    if (resource.submission.submitterId !== session.user.id) {
      return NextResponse.json({ error: { message: 'Not authorized' } }, { status: 403 })
    }

    if (resource.submission.isSubmitted) {
      return NextResponse.json({ error: { message: 'Cannot modify submitted entry' } }, { status: 400 })
    }

    const updatedResource = await prisma.demoDayResource.update({
      where: { id: resourceId },
      data: {
        ...body,
        updatedAt: new Date(),
      }
    })

    logger.info('Demo day resource updated', { resourceId, userId: session.user.id })

    return NextResponse.json({
      success: true,
      data: { resource: updatedResource }
    })

  } catch (error) {
    logger.error('Failed to update resource', { resourceId: params.resourceId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to update resource' } },
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

    const { resourceId } = params

    const resource = await prisma.demoDayResource.findUnique({
      where: { id: resourceId },
      include: {
        submission: true
      }
    })

    if (!resource) {
      return NextResponse.json({ error: { message: 'Resource not found' } }, { status: 404 })
    }

    if (resource.submission.submitterId !== session.user.id) {
      return NextResponse.json({ error: { message: 'Not authorized' } }, { status: 403 })
    }

    if (resource.submission.isSubmitted) {
      return NextResponse.json({ error: { message: 'Cannot modify submitted entry' } }, { status: 400 })
    }

    await prisma.demoDayResource.delete({
      where: { id: resourceId }
    })

    logger.info('Demo day resource deleted', { resourceId, userId: session.user.id })

    return NextResponse.json({
      success: true,
      data: { message: 'Resource deleted successfully' }
    })

  } catch (error) {
    logger.error('Failed to delete resource', { resourceId: params.resourceId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to delete resource' } },
      { status: 500 }
    )
  }
}