import { NextResponse } from 'next/server'
import { ResourceService } from '@/lib/services/resource-service'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/database'

export async function GET(request) {
  try {
    const url = new URL(request.url)

    // Parse filters from query parameters
    const filters = {
      search: url.searchParams.get('search') || '',
      type: url.searchParams.get('type') || 'all',
      category: url.searchParams.get('category') || 'all',
      difficulty: url.searchParams.get('difficulty') || 'all',
      isFeatured: url.searchParams.get('isFeatured') === 'true' ? true : undefined,
      isPublic: true, // Only show public resources
      page: parseInt(url.searchParams.get('page')) || 1,
      limit: parseInt(url.searchParams.get('limit')) || 24,
    }

    // Parse array filters
    const tagsParam = url.searchParams.get('tags')
    if (tagsParam) {
      filters.tags = tagsParam.split(',').filter(Boolean)
    }

    const topicsParam = url.searchParams.get('topics')
    if (topicsParam) {
      filters.topics = topicsParam.split(',').filter(Boolean)
    }

    // Get the main workspace ID (you may need to adjust this based on your setup)
    const mainWorkspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })

    if (!mainWorkspace) {
      return NextResponse.json(
        { error: { message: 'Workspace not found' } },
        { status: 404 }
      )
    }

    const result = await ResourceService.findByWorkspace(mainWorkspace.id, filters)

    // Get available filter options
    const [categories, topics, tags] = await Promise.all([
      prisma.resource.findMany({
        where: { isPublic: true, category: { not: null } },
        distinct: ['category'],
        select: { category: true },
      }),
      prisma.resource.findMany({
        where: { isPublic: true, topics: { isEmpty: false } },
        select: { topics: true },
      }),
      prisma.resource.findMany({
        where: { isPublic: true, tags: { isEmpty: false } },
        select: { tags: true },
      }),
    ])

    // Flatten and deduplicate topics and tags
    const allTopics = [...new Set(topics.flatMap(r => r.topics))].sort()
    const allTags = [...new Set(tags.flatMap(r => r.tags))].sort()
    const allCategories = categories.map(c => c.category).filter(Boolean).sort()

    logger.info('Public resources fetched', {
      filters,
      resourceCount: result.resources.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        filterOptions: {
          categories: allCategories,
          topics: allTopics,
          tags: allTags,
          difficulties: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
          types: ['VIDEO', 'PODCAST', 'DOCUMENT', 'ARTICLE', 'PRESENTATION', 'LINK'],
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching public resources', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch resources' } },
      { status: 500 }
    )
  }
}
