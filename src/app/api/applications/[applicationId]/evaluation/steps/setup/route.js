import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';

/**
 * POST /api/applications/[applicationId]/evaluation/steps/setup
 * Create evaluation steps for an application
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    // Parse request body
    const body = await request.json();
    const { step1, step2 } = body;

    // Validate input
    if (!step1 || !step2) {
      return apiError('Both step1 and step2 configurations are required', 400);
    }

    if (!step1.name || !step1.criteria || !Array.isArray(step1.criteria)) {
      return apiError('Step 1 must have a name and criteria array', 400);
    }

    if (!step2.name || !step2.criteria || !Array.isArray(step2.criteria)) {
      return apiError('Step 2 must have a name and criteria array', 400);
    }

    // Create evaluation steps
    const result = await EvaluationService.createSteps(
      applicationId,
      step1,
      step2
    );

    return apiResponse(result, 201);
  } catch (error) {
    console.error('Error creating evaluation steps:', error);
    if (error.message === 'Evaluation steps already exist for this application') {
      return apiError(error.message, 400);
    }
    return handleApiError(error);
  }
}
