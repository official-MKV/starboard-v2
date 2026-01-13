import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';
import { EvaluationEmailService } from '@/lib/services/evaluation-email-service';
import { prisma } from '@/lib/database';
import { PERMISSIONS } from '@/lib/utils/permissions';

/**
 * POST /api/applications/[applicationId]/evaluation/steps/[stepId]/advance
 * Manually advance selected submissions to Step 2 (admin only)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;

    // Check if user has permission to advance submissions
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { workspaceId: true }
    });

    if (!application) {
      return apiError('Application not found', 404);
    }

    // Get user's workspace member and role permissions
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: application.workspaceId,
          userId: session.user.id
        }
      },
      include: {
        role: { select: { permissions: true } }
      }
    });

    if (!member) {
      return apiError('Not a member of this workspace', 403);
    }

    // Check for EVALUATION_ADVANCE permission
    const permissions = Array.isArray(member.role.permissions)
      ? member.role.permissions
      : (typeof member.role.permissions === 'string' ? JSON.parse(member.role.permissions) : []);

    if (!permissions.includes(PERMISSIONS.EVALUATION_ADVANCE)) {
      return apiError('Insufficient permissions. Requires evaluation.advance permission.', 403);
    }

    // Parse request body
    const body = await request.json();
    const { submissionIds } = body;

    // Validate input
    if (!submissionIds || !Array.isArray(submissionIds)) {
      return apiError('submissionIds must be an array', 400);
    }

    if (submissionIds.length === 0) {
      return apiError('At least one submission ID is required', 400);
    }

    // Get step 2 name for email
    const steps = await prisma.evaluationStep.findMany({
      where: { applicationId },
      orderBy: { stepNumber: 'asc' }
    });
    const step2 = steps.find(s => s.stepNumber === 2);

    // Advance submissions to step 2
    const result = await EvaluationService.manuallyAdvanceToStep2(submissionIds);

    // Send emails to advanced candidates
    const submissions = await prisma.applicationSubmission.findMany({
      where: { id: { in: submissionIds } }
    });

    for (const submission of submissions) {
      await EvaluationEmailService.sendStepAdvancementEmail(
        submission,
        step2?.name || 'Interview Round'
      );
    }

    return apiResponse(result, 200);
  } catch (error) {
    console.error('Error advancing submissions:', error);
    return handleApiError(error);
  }
}
