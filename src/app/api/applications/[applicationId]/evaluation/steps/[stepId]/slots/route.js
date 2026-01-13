import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { EvaluationService } from '@/lib/services/evaluation-service';

/**
 * POST /api/applications/[applicationId]/evaluation/steps/[stepId]/slots
 * Generate interview slots for a step (admin only)
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
    const { dateTimeSlots } = body;

    // Validate input
    if (!dateTimeSlots || !Array.isArray(dateTimeSlots)) {
      return apiError('dateTimeSlots must be an array', 400);
    }

    if (dateTimeSlots.length === 0) {
      return apiError('At least one slot is required', 400);
    }

    // Validate each slot
    for (const slot of dateTimeSlots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        return apiError('Each slot must have date, startTime, and endTime', 400);
      }
    }

    // Generate slots
    const slots = await EvaluationService.generateInterviewSlots(stepId, dateTimeSlots);

    return apiResponse(slots, 201);
  } catch (error) {
    console.error('Error generating interview slots:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/applications/[applicationId]/evaluation/steps/[stepId]/slots
 * Get interview slots for a step
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId, stepId } = await params;

    // Check if user is admin or candidate
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('availableOnly') === 'true';

    let slots;
    if (availableOnly) {
      // For candidates - only show available slots
      slots = await EvaluationService.getAvailableSlots(stepId);
    } else {
      // For admins - show all slots including booked
      slots = await EvaluationService.getAllSlots(stepId);
    }

    return apiResponse(slots, 200);
  } catch (error) {
    console.error('Error fetching interview slots:', error);
    return handleApiError(error);
  }
}
