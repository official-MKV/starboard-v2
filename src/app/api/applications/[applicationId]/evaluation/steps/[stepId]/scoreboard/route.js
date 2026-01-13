import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';

/**
 * GET /api/applications/[applicationId]/evaluation/steps/[stepId]/scoreboard
 * Get scoreboard for a step (admin only)
 * Optional query param: submissionId - filter to specific submission
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;

    // Get submissionId from query params if provided
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    // Get scoreboard with optional filter
    const options = submissionId ? { submissionId } : {};
    const scoreboard = await EvaluationService.getStepScoreboard(stepId, options);

    return apiResponse(scoreboard, 200);
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    if (error.message.includes('not found')) {
      return apiError(error.message, 404);
    }
    return handleApiError(error);
  }
}
