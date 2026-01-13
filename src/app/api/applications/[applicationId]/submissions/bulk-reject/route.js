import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * POST /api/applications/[applicationId]/submissions/bulk-reject
 * Bulk reject submissions (admin only)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = params;
    const body = await request.json();
    const { submissionIds } = body;

    // Validate input
    if (!submissionIds || !Array.isArray(submissionIds)) {
      return apiError('submissionIds must be an array', 400);
    }

    if (submissionIds.length === 0) {
      return apiError('At least one submission ID is required', 400);
    }

    // Update submissions to REJECTED status
    const result = await prisma.applicationSubmission.updateMany({
      where: {
        id: { in: submissionIds },
        applicationId: applicationId
      },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: session.user.id
      }
    });

    return apiResponse({
      message: `Rejected ${result.count} submissions`,
      count: result.count
    }, 200);
  } catch (error) {
    console.error('Error rejecting submissions:', error);
    return handleApiError(error);
  }
}
