import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * GET /api/applications/[applicationId]/evaluation/cutoff
 * Get cutoff scores for evaluation steps
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        cutoffScores: true,
        evaluationSettings: true
      }
    });

    if (!application) {
      return apiError('Application not found', 404);
    }

    // Parse cutoff scores
    const cutoffScores = application.cutoffScores
      ? (typeof application.cutoffScores === 'string'
          ? JSON.parse(application.cutoffScores)
          : application.cutoffScores)
      : { step1: 0, step2: 0 };

    return apiResponse({
      cutoffScores,
      evaluationSettings: application.evaluationSettings
    }, 200);
  } catch (error) {
    console.error('Error fetching cutoff scores:', error);
    return handleApiError(error);
  }
}

/**
 * PATCH /api/applications/[applicationId]/evaluation/cutoff
 * Update cutoff scores for evaluation steps
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;
    const body = await request.json();
    const { step1, step2 } = body;

    // Validate input
    if (step1 === undefined && step2 === undefined) {
      return apiError('At least one of step1 or step2 must be provided', 400);
    }

    // Get application with evaluation settings
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        cutoffScores: true,
        evaluationSettings: true
      }
    });

    if (!application) {
      return apiError('Application not found', 404);
    }

    // Parse evaluation settings to get min/max
    const evalSettings = application.evaluationSettings
      ? (typeof application.evaluationSettings === 'string'
          ? JSON.parse(application.evaluationSettings)
          : application.evaluationSettings)
      : { minScore: 1, maxScore: 10 };

    const minScore = evalSettings.minScore || 1;
    const maxScore = evalSettings.maxScore || 10;

    // Validate cutoff scores are within range
    if (step1 !== undefined && (step1 < minScore || step1 > maxScore)) {
      return apiError(
        `Step 1 cutoff must be between ${minScore} and ${maxScore}`,
        400
      );
    }

    if (step2 !== undefined && (step2 < minScore || step2 > maxScore)) {
      return apiError(
        `Step 2 cutoff must be between ${minScore} and ${maxScore}`,
        400
      );
    }

    // Get current cutoff scores
    const currentCutoff = application.cutoffScores
      ? (typeof application.cutoffScores === 'string'
          ? JSON.parse(application.cutoffScores)
          : application.cutoffScores)
      : { step1: 0, step2: 0 };

    // Update cutoff scores
    const newCutoffScores = {
      step1: step1 !== undefined ? step1 : currentCutoff.step1,
      step2: step2 !== undefined ? step2 : currentCutoff.step2
    };

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        cutoffScores: newCutoffScores
      },
      select: {
        id: true,
        cutoffScores: true
      }
    });

    return apiResponse({
      message: 'Cutoff scores updated successfully',
      cutoffScores: newCutoffScores
    }, 200);
  } catch (error) {
    console.error('Error updating cutoff scores:', error);
    return handleApiError(error);
  }
}
