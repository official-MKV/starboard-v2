export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { receiverId, isTyping } = await request.json()

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }

    // Broadcast typing status to the other user
    broadcastToUser(receiverId, 'typing_indicator', {
      userId: session.user.id,
      isTyping,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling typing indicator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
