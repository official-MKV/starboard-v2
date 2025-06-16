// app/api/users/[userId]/password/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

/**
 * PUT /api/users/[userId]/password
 * Change user password
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params

    // Users can only change their own password
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: { message: 'You can only change your own password' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: { message: 'Current password and new password are required' } },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: { message: 'New password must be at least 8 characters long' } },
        { status: 400 }
      )
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 })
    }

    if (!user.password) {
      return NextResponse.json(
        { error: { message: 'No password set. Please use password reset instead.' } },
        { status: 400 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: { message: 'Current password is incorrect' } },
        { status: 400 }
      )
    }

    // Hash new password
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    })

    logger.info('Password changed successfully', {
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error) {
    logger.error('Error changing password', { error: error.message, userId: params.userId })
    return NextResponse.json({ error: { message: 'Failed to change password' } }, { status: 500 })
  }
}
