export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { files, folder = 'uploads' } = body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Files array is required' }, { status: 400 })
    }

    // Validate all files
    for (const file of files) {
      if (!file.fileName || !file.fileType) {
        return NextResponse.json(
          { error: 'Each file must have fileName and fileType' },
          { status: 400 }
        )
      }

      const validation = awsService.validateFile(file.fileName, file.fileType, 0)
      if (!validation.valid) {
        return NextResponse.json(
          { error: `File ${file.fileName} validation failed: ${validation.errors.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const presignedData = await awsService.getBatchPresignedUrls(files, folder, session.user.id)

    return NextResponse.json({
      success: true,
      data: presignedData,
    })
  } catch (error) {
    logger.error('Failed to generate batch presigned URLs', {
      error: error.message,
    })

    return NextResponse.json({ error: 'Failed to generate upload URLs' }, { status: 500 })
  }
}
