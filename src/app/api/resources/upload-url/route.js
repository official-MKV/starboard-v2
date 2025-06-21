import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { ResourceService } from '@/lib/services/resource-service'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    const { fileName, fileType, fileSize } = await request.json()

    const uploadData = await ResourceService.getUploadUrl(
      fileName,
      fileType,
      fileSize,
      workspaceContext.workspaceId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: uploadData,
    })
  } catch (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }
}
