// app/api/users/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma, handleDatabaseError } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * GET /api/users
 * Get all users for current workspace
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['users.view', 'users.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view users' } },
        { status: 403 }
      )
    }

    // Get users for workspace
    const users = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspaceContext.workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            isEmailVerified: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            color: true,
            isDefault: true,
            isSystem: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'desc' }],
    })

    // Transform data
    const transformedUsers = users.map(member => ({
      id: member.user.id,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      email: member.user.email,
      avatar: member.user.avatar,
      isActive: member.isActive,
      isEmailVerified: member.user.isEmailVerified,
      lastLoginAt: member.user.lastLoginAt,
      joinedAt: member.joinedAt,
      role: member.role,
      workspaceMemberId: member.id,
    }))

    logger.info('Users fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      userCount: transformedUsers.length,
    })

    return NextResponse.json({
      success: true,
      data: { users: transformedUsers },
    })
  } catch (error) {
    logger.error('Error fetching users', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch users' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'users.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create users' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { firstName, lastName, email, roleId, sendInvitation = true } = body

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: { message: 'First name, last name, and email are required' } },
        { status: 400 }
      )
    }

    if (!roleId) {
      return NextResponse.json({ error: { message: 'Role is required' } }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: { message: 'Invalid email format' } }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (existingUser) {
      // Check if already a member of this workspace
      const existingMember = await prisma.workspaceMember.findFirst({
        where: {
          userId: existingUser.id,
          workspaceId: workspaceContext.workspaceId,
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: { message: 'User is already a member of this workspace' } },
          { status: 400 }
        )
      }
    }

    // Verify role exists and belongs to workspace
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        workspaceId: workspaceContext.workspaceId,
      },
    })

    if (!role) {
      return NextResponse.json({ error: { message: 'Invalid role selected' } }, { status: 400 })
    }

    const result = await prisma.$transaction(async tx => {
      let user = existingUser

      // Create user if doesn't exist
      if (!user) {
        user = await tx.user.create({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            isEmailVerified: false,
          },
        })
      }

      // Create workspace membership
      const member = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspaceContext.workspaceId,
          roleId: roleId,
          isActive: true,
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              isEmailVerified: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              color: true,
              isDefault: true,
              isSystem: true,
            },
          },
        },
      })

      return member
    })

    logger.info('User created/added', {
      userId: result.user.id,
      userEmail: result.user.email,
      workspaceId: workspaceContext.workspaceId,
      roleId: roleId,
      createdBy: session.user.id,
      wasExistingUser: !!existingUser,
    })

    // Transform response data
    const responseData = {
      id: result.user.id,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      email: result.user.email,
      avatar: result.user.avatar,
      isActive: result.isActive,
      isEmailVerified: result.user.isEmailVerified,
      joinedAt: result.joinedAt,
      role: result.role,
      workspaceMemberId: result.id,
    }

    return NextResponse.json({
      success: true,
      data: { user: responseData },
      message: existingUser ? 'User added to workspace successfully' : 'User created successfully',
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { message: 'User with this email already exists' } },
        { status: 400 }
      )
    }

    logger.error('Error creating user', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create user' } },
      { status: 500 }
    )
  }
}
