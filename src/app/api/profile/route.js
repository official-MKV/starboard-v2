import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userService } from '@/lib/services/database'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export async function GET() {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', '/api/profile', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('GET', '/api/profile', session.user.id)

    const user = await userService.findById(session.user.id)

    if (!user) {
      timer.log('GET', '/api/profile', 404, session.user.id)
      return apiError('User not found', 404)
    }

    timer.log('GET', '/api/profile', 200, session.user.id)

    return apiResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        company: user.company,
        website: user.website,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    logger.apiError('GET', '/api/profile', error)
    timer.log('GET', '/api/profile', 500)
    return handleApiError(error)
  }
}

export async function PUT(request) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', '/api/profile', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('PUT', '/api/profile', session.user.id)

    const validation = await validateRequest(request, updateProfileSchema)

    if (!validation.success) {
      timer.log('PUT', '/api/profile', 400, session.user.id)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { firstName, lastName, phone, bio, location, company, website } = validation.data

    // Update user profile
    const updatedUser = await userService.updateProfile(session.user.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      company: company?.trim() || null,
      website: website?.trim() || null,
    })

   

    timer.log('PUT', '/api/profile', 200, session.user.id)

    return apiResponse({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        location: updatedUser.location,
        company: updatedUser.company,
        website: updatedUser.website,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    logger.apiError('PUT', '/api/profile', error, session?.user?.id)
    timer.log('PUT', '/api/profile', 500, session?.user?.id)
    return handleApiError(error)
  }
}
