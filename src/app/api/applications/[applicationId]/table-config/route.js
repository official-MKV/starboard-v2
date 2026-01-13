import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { prisma } from '@/lib/database';

/**
 * GET /api/applications/[applicationId]/table-config
 * Get table configuration (pinned fields)
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;

    // Get application with table config
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        tableConfig: true
      }
    });

    if (!application) {
      return apiError('Application not found', 404);
    }

    // Parse table config
    const config = application.tableConfig
      ? (typeof application.tableConfig === 'string'
          ? JSON.parse(application.tableConfig)
          : application.tableConfig)
      : { pinnedFields: [] };

    return apiResponse(config, 200);
  } catch (error) {
    console.error('Error fetching table config:', error);
    return handleApiError(error);
  }
}

/**
 * PATCH /api/applications/[applicationId]/table-config
 * Update table configuration (admin only)
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { applicationId } = await params;
    const body = await request.json();
    const { pinnedFields } = body;

    if (!Array.isArray(pinnedFields)) {
      return apiError('pinnedFields must be an array', 400);
    }

    // Update application table config
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        tableConfig: {
          pinnedFields
        }
      }
    });

    return apiResponse({
      message: 'Table configuration updated',
      config: { pinnedFields }
    }, 200);
  } catch (error) {
    console.error('Error updating table config:', error);
    return handleApiError(error);
  }
}
