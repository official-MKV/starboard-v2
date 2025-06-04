// app/api/resources/[resourceId]/download/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ResourceService } from '@/lib/services/resource-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/resources/[resourceId]/download
 * Generate download URL for resource
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { resourceId } = params

    // Generate download URL
    const result = await ResourceService.getDownloadUrl(resourceId, session.user.id)

    logger.info('Download URL generated', {
      resourceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error generating download URL', {
      resourceId: params.resourceId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate download URL' } },
      { status: 500 }
    )
  }
}
