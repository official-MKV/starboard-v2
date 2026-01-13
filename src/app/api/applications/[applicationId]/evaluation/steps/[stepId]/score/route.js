import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';

/**
 * POST /api/applications/[applicationId]/evaluation/steps/[stepId]/score
 * Submit scores for a submission
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;

    // Parse request body
    const body = await request.json();
    const { submissionId, criteriaScores, notes } = body;

    // Validate input
    if (!submissionId) {
      return apiError('submissionId is required', 400);
    }

    if (!criteriaScores || typeof criteriaScores !== 'object') {
      return apiError('criteriaScores must be an object', 400);
    }

    // Submit score
    const score = await EvaluationService.submitScore(
      submissionId,
      stepId,
      session.user.id,
      criteriaScores,
      notes || null
    );

    return apiResponse(score, 201);
  } catch (error) {
    console.error('Error submitting score:', error);
    if (error.message.includes('already scored')) {
      return apiError(error.message, 400);
    }
    if (error.message.includes('not found')) {
      return apiError(error.message, 404);
    }
    if (error.message.includes('Missing score')) {
      return apiError(error.message, 400);
    }
    return handleApiError(error);
  }
}
