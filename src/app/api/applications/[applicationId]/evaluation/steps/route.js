import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * GET /api/applications/[applicationId]/evaluation/steps
 * Get evaluation steps for an application
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    // Get evaluation steps
    const steps = await prisma.evaluationStep.findMany({
      where: { applicationId },
      include: {
        criteria: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            scores: true,
            interviewSlots: true
          }
        }
      },
      orderBy: { stepNumber: 'asc' }
    });

    return apiResponse(steps, 200);
  } catch (error) {
    console.error('Error fetching evaluation steps:', error);
    return handleApiError(error);
  }
}
