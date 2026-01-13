import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * GET /api/applications/[applicationId]/fields
 * Get all form fields for an application
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    // Get all fields for this application
    const fields = await prisma.applicationField.findMany({
      where: {
        applicationId: applicationId
      },
      orderBy: {
        order: 'asc'
      }
    });

    return apiResponse(fields, 200);
  } catch (error) {
    console.error('Error fetching application fields:', error);
    return handleApiError(error);
  }
}
