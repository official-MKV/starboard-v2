// app/api/auth/ws-token/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create a JWT token for WebSocket authentication
    const token = jwt.sign(
      {
        userId: session.user.id,
        sub: session.user.id, // Standard JWT claim
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
      },
      process.env.NEXTAUTH_SECRET,
      {
        expiresIn: '24h',
        issuer: 'starboard-nigcomsat',
        audience: 'websocket',
      }
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error creating WebSocket token:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
