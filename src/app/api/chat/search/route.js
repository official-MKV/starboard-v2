import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { WorkspaceContext } from '@/lib/workspace-context'
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const userId = searchParams.get('userId') // Search within specific conversation
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const where = {
      isDeleted: false,
      content: {
        contains: query,
        mode: 'insensitive',
      },
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    }

    // If searching within specific conversation
    if (userId) {
      where.OR = [
        { senderId: session.user.id, receiverId: userId },
        { senderId: userId, receiverId: session.user.id },
      ]
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error searching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
