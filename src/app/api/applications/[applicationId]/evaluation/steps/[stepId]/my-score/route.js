import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * GET /api/applications/[applicationId]/evaluation/steps/[stepId]/my-score
 * Check if current user has already scored a submission at this step
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return apiError('submissionId is required', 400);
    }

    // Find existing score from this user
    const existingScore = await prisma.applicationScore.findUnique({
      where: {
        submissionId_stepId_judgeId: {
          submissionId,
          stepId,
          judgeId: session.user.id
        }
      },
      include: {
        step: {
          include: {
            criteria: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });

    return apiResponse({
      score: existingScore,
      hasScored: !!existingScore
    }, 200);
  } catch (error) {
    console.error('Error checking score:', error);
    return handleApiError(error);
  }
}
