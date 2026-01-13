import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';
import { EvaluationEmailService } from '@/lib/services/evaluation-email-service';

/**
 * POST /api/applications/[applicationId]/evaluation/slots/[slotId]/book
 * Book an interview slot
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, slotId } = await params;

    // Parse request body
    const body = await request.json();
    const { submissionId } = body;

    // Validate input
    if (!submissionId) {
      return apiError('submissionId is required', 400);
    }

    // Book slot
    const bookedSlot = await EvaluationService.bookInterviewSlot(submissionId, slotId);

    // Send confirmation email
    if (bookedSlot.submission) {
      await EvaluationEmailService.sendInterviewBookingEmail(
        bookedSlot.submission,
        bookedSlot
      );
    }

    return apiResponse(bookedSlot, 200);
  } catch (error) {
    console.error('Error booking interview slot:', error);
    if (error.message.includes('already booked')) {
      return apiError(error.message, 400);
    }
    if (error.message.includes('not found')) {
      return apiError(error.message, 404);
    }
    return handleApiError(error);
  }
}
