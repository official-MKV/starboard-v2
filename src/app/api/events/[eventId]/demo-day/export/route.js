import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { DemoDayService } from '@/lib/services/demoday-service'

export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = params

    const results = await DemoDayService.exportResults(eventId)

    const csvHeaders = [
      'Rank',
      'Team Name',
      'Project Title',
      'Submitter Name',
      'Submitter Email',
      'Category',
      'Stage',
      'Average Score',
      'Total Score',
      'Judge Count',
      'Submitted At',
      'Innovation Score',
      'Execution Score',
      'Market Size Score',
      'Team Score',
      'Presentation Score',
      'Judge Feedback'
    ]

    const csvRows = results.map(result => [
      result.rank,
      result.teamName,
      result.projectTitle,
      result.submitterName,
      result.submitterEmail,
      result.category || '',
      result.stage || '',
      result.averageScore?.toFixed(2) || '0.00',
      result.totalScore?.toFixed(2) || '0.00',
      result.judgeCount,
      result.submittedAt ? new Date(result.submittedAt).toISOString() : '',
      result.scores.map(s => s.innovation).join(';') || '',
      result.scores.map(s => s.execution).join(';') || '',
      result.scores.map(s => s.marketSize).join(';') || '',
      result.scores.map(s => s.team).join(';') || '',
      result.scores.map(s => s.presentation).join(';') || '',
      result.scores.map(s => s.feedback || '').join(';') || ''
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => 
        typeof field === 'string' && field.includes(',') 
          ? `"${field.replace(/"/g, '""')}"` 
          : field
      ).join(','))
    ].join('\n')

    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="demo-day-results-${eventId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

    logger.info('Demo day results exported', { eventId, resultCount: results.length })

    return response

  } catch (error) {
    logger.error('Failed to export demo day results', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to export results' } },
      { status: 500 }
    )
  }
}