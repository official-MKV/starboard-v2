// app/api/users/[userId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/[userId]
 * Get a specific user's profile
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params

    // Users can view their own profile, or need permissions to view others
    const isOwnProfile = session.user.id === userId

    if (!isOwnProfile) {
      // Get workspace context for permission check
      const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
      if (!workspaceContext) {
        return NextResponse.json(
          { error: { message: 'Workspace context required' } },
          { status: 400 }
        )
      }

      const hasPermission = await WorkspaceContext.hasAnyPermission(
        session.user.id,
        workspaceContext.workspaceId,
        ['users.view', 'users.manage']
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: { message: 'Insufficient permissions to view this user' } },
          { status: 403 }
        )
      }
    }

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        phone: true,
        bio: true,
        location: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedIn: true,
        twitter: true,
        isEmailVerified: true,
        timezone: true,
        language: true,
        isActive: true,
        lastLoginAt: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        profileData: true,
        // Include workspace membership if checking permissions
        ...(isOwnProfile
          ? {}
          : {
              workspaceMembers: {
                select: {
                  id: true,
                  isActive: true,
                  joinedAt: true,
                  role: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            }),
      },
    })

    if (!user) {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })
    }

    logger.info('User profile fetched', {
      userId: user.id,
      requestedBy: session.user.id,
      isOwnProfile,
    })

    return NextResponse.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    logger.error('Error fetching user profile', { error: error.message, userId: params.userId })
    return NextResponse.json(
      { error: { message: 'Failed to fetch user profile' } },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params
    const isOwnProfile = session.user.id === userId

    if (!isOwnProfile) {
      const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
      if (!workspaceContext) {
        return NextResponse.json(
          { error: { message: 'Workspace context required' } },
          { status: 400 }
        )
      }

      const hasPermission = await WorkspaceContext.hasPermission(
        session.user.id,
        workspaceContext.workspaceId,
        'users.manage'
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: { message: 'Insufficient permissions to edit this user' } },
          { status: 403 }
        )
      }
    }

    // Parse request body
    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      bio,
      location,
      company,
      jobTitle,
      website,
      linkedIn,
      twitter,
      timezone,
      language,
      avatar,
      profileData,
    } = body

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: { message: 'First name and last name are required' } },
        { status: 400 }
      )
    }

    // Validate website URL if provided
    if (website && website.trim()) {
      try {
        new URL(website.trim())
      } catch {
        return NextResponse.json(
          { error: { message: 'Invalid website URL format' } },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      avatar: avatar?.trim() || null,
      phone: phone?.trim() || null,
      bio: bio?.trim() || null,
      location: location?.trim() || null,
      company: company?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      website: website?.trim() || null,
      linkedIn: linkedIn?.trim() || null,
      twitter: twitter?.trim() || null,
      timezone: timezone || 'UTC',
      language: language || 'en',
      updatedAt: new Date(),
    }

    // Handle profileData if provided
    if (profileData !== undefined) {
      updateData.profileData = profileData
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        phone: true,
        bio: true,
        location: true,
        company: true,
        jobTitle: true,
        website: true,
        linkedIn: true,
        twitter: true,
        timezone: true,
        language: true,
        profileData: true,
        updatedAt: true,
      },
    })

    logger.info('User profile updated', {
      userId: updatedUser.id,
      updatedBy: session.user.id,
      isOwnProfile,
      updatedFields: Object.keys(updateData),
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: 'Profile updated successfully',
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })
    }

    logger.error('Error updating user profile', { error: error.message, userId: params.userId })
    return NextResponse.json({ error: { message: 'Failed to update profile' } }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[userId]
 * Partially update user (for admin actions like activating/deactivating)
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params

    // Only admins can use PATCH for user management actions
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'users.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions for this action' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { isActive, isVerified } = body

    const updateData = {}
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
    }
    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: { message: 'No valid fields to update' } }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        isVerified: true,
      },
    })

    logger.info('User status updated', {
      userId: updatedUser.id,
      updatedBy: session.user.id,
      changes: updateData,
    })

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: 'User status updated successfully',
    })
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })
    }

    logger.error('Error updating user status', { error: error.message, userId: params.userId })
    return NextResponse.json(
      { error: { message: 'Failed to update user status' } },
      { status: 500 }
    )
  }
}
