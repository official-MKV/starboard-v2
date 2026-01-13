import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';
import { EvaluationEmailService } from '@/lib/services/evaluation-email-service';
import { prisma } from '@/lib/database';
import { PERMISSIONS } from '@/lib/utils/permissions';

/**
 * POST /api/applications/[applicationId]/evaluation/admit
 * Manually admit selected submissions (admin only)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    // Check if user has permission to admit submissions
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

    // Check for EVALUATION_ADMIT permission
    const permissions = Array.isArray(member.role.permissions)
      ? member.role.permissions
      : (typeof member.role.permissions === 'string' ? JSON.parse(member.role.permissions) : []);

    if (!permissions.includes(PERMISSIONS.EVALUATION_ADMIT)) {
      return apiError('Insufficient permissions. Requires evaluation.admit permission.', 403);
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

    // Admit submissions
    const result = await EvaluationService.manuallyAdmit(submissionIds);

    // Send acceptance emails
    const submissions = await prisma.applicationSubmission.findMany({
      where: { id: { in: submissionIds } }
    });

    for (const submission of submissions) {
      await EvaluationEmailService.sendAcceptanceEmail(submission);
    }

    return apiResponse(result, 200);
  } catch (error) {
    console.error('Error admitting submissions:', error);
    return handleApiError(error);
  }
}
