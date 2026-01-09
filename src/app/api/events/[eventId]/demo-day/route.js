// app/api/events/[eventId]/demo-day/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET(request, { params }) {
  try {
    const { eventId } = await params
    console.log("this is the demoday id")
    console.log(eventId)

    const event = await prisma.event.findUnique({
      where: { 
        id: eventId,
        type: 'DEMO_DAY',
        
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        startDate: true,
        endDate: true,
        location: true,
        isVirtual: true,
        isPublic: true,
        bannerImage: true,
        demoDayConfig: {
          select: {
            submissionDeadline: true,
            allowLateSubmissions: true,
            maxTeamSize: true,
            maxPitchDuration: true,
            requireVideo: true,
            requirePresentation: true,
            requireDemo: true,
            requireBusinessPlan: true,
            description: true,
          }
        },
        _count: {
          select: {
            demoDaySubmissions: {
              where: { isSubmitted: true }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: { message: 'Demo day not found or not public' } }, 
        { status: 404 }
      )
    }

    const now = new Date()
    const submissionDeadline = event.demoDayConfig?.submissionDeadline ? new Date(event.demoDayConfig.submissionDeadline) : null
    
    const submissionStatus = {
      isOpen: submissionDeadline ? now <= submissionDeadline : false,
      deadline: submissionDeadline,
      allowLate: event.demoDayConfig?.allowLateSubmissions || false
    }

    logger.info('Public demo day details fetched', { 
      eventId, 
      isSubmissionOpen: submissionStatus.isOpen 
    })

    return NextResponse.json({
      success: true,
      data: {
        event: {
          ...event,
          submissionStatus,
          submissionCount: event._count.demoDaySubmissions
        }
      }
    })

  } catch (error) {
    const { eventId } = await params
    logger.error('Failed to fetch public demo day details', {
      eventId: eventId, 
      error: error.message 
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch demo day details' } },
      { status: 500 }
    )
  }
}