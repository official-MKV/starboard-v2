import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * PATCH /api/applications/[applicationId]/evaluation/steps/[stepId]/pinned-fields
 * Update pinned fields for scoreboard table display
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;
    const body = await request.json();
    const { pinnedFields } = body;

    // Validate input
    if (!Array.isArray(pinnedFields)) {
      return apiError('pinnedFields must be an array', 400);
    }

    // Verify step exists and belongs to this application
    const step = await prisma.evaluationStep.findFirst({
      where: {
        id: stepId,
        applicationId: applicationId
      }
    });

    if (!step) {
      return apiError('Evaluation step not found', 404);
    }

    // Update pinned fields
    const updated = await prisma.evaluationStep.update({
      where: { id: stepId },
      data: {
        pinnedFields: pinnedFields
      }
    });

    return apiResponse({
      message: 'Pinned fields updated successfully',
      pinnedFields: updated.pinnedFields
    }, 200);
  } catch (error) {
    console.error('Error updating pinned fields:', error);
    return handleApiError(error);
  }
}
