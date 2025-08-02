// lib/services/event-service.js
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { ZoomService } from '@/lib/services/zoom-service'
// import { NotificationService } from '@/lib/services/notification-service'
import { EmailService } from '@/lib/services/email-service'

export class EventService {
  /**
   * Create a new event
   */
  static async create(workspaceId, eventData, creatorId) {
    try {
      const { speakers = [], resources = [], accessRules = [], ...baseEventData } = eventData

      // Remove requireApproval if it exists in the data
      delete baseEventData.requireApproval

      return await prisma.$transaction(async tx => {
        // Create Zoom meeting if virtual
        let zoomMeetingId = null
        let meetingPassword = null
        let virtualLink = null

        if (baseEventData.isVirtual) {
          try {
            const zoomMeeting = await ZoomService.createMeeting({
              topic: baseEventData.title,
              start_time: baseEventData.startDate,
              duration: Math.ceil(
                (new Date(baseEventData.endDate) - new Date(baseEventData.startDate)) / (1000 * 60)
              ),
              timezone: baseEventData.timezone || 'UTC',
              settings: {
                waiting_room: baseEventData.waitingRoom,
                auto_recording: baseEventData.autoRecord ? 'cloud' : 'none',
                join_before_host: false,
                mute_upon_entry: true,
              },
            })

            zoomMeetingId = zoomMeeting.id
            meetingPassword = zoomMeeting.password
            virtualLink = zoomMeeting.join_url

            logger.info('Zoom meeting created for event', {
              eventTitle: baseEventData.title,
              zoomMeetingId,
              joinUrl: virtualLink,
            })
          } catch (zoomError) {
            logger.warn('Failed to create Zoom meeting', { error: zoomError.message })
          }
        }

        // Create the event
        const event = await tx.event.create({
          data: {
            ...baseEventData,
            virtualLink,
            workspaceId,
            creatorId,
            zoomMeetingId,
            meetingPassword,
          },
        })

        // Add speakers
        if (speakers.length > 0) {
          await tx.eventSpeaker.createMany({
            data: speakers.map((speaker, index) => ({
              eventId: event.id,
              ...speaker,
              order: index,
            })),
          })
        }

        // Add event access rules
        if (accessRules.length > 0) {
          await tx.eventAccess.createMany({
            data: accessRules.map(rule => ({
              eventId: event.id,
              ...rule,
            })),
          })
        }

        // Link existing resources
        if (resources.length > 0) {
          await tx.eventResource.createMany({
            data: resources.map(resourceId => ({
              eventId: event.id,
              resourceId,
            })),
          })
        }

        logger.info('Event created', {
          eventId: event.id,
          workspaceId,
          creatorId,
          hasZoomMeeting: !!zoomMeetingId,
        })

        // Return the created event with relations
        return await tx.event.findUnique({
          where: { id: event.id },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            speakers: {
              orderBy: { order: 'asc' },
            },
            registrations: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    email: true,
                  },
                },
              },
            },
            resources: {
              include: {
                resource: true,
              },
            },
            accessRules: true,
            recordings: {
              where: { isPublic: true },
              orderBy: { createdAt: 'desc' },
            },
            waitlist: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { position: 'asc' },
            },
            reminders: {
              where: { isSent: false },
            },
            _count: {
              select: {
                registrations: true,
                speakers: true,
                waitlist: true,
              },
            },
          },
        })
      })
    } catch (error) {
      logger.error('Failed to create event', { error: error.message, workspaceId, creatorId })
      throw new Error(error.message || 'Failed to create event')
    }
  }

  /**
   * Find event by ID with all relations
   */
 static async findById(eventId, userId = null) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
            scoringCriteria: true
          }
        },
        speakers: {
          orderBy: { order: 'asc' },
        },
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
        resources: {
          include: {
            resource: true,
          },
        },
        accessRules: true,
        recordings: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
        },
        waitlist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        reminders: {
          where: { isSent: false },
        },
        _count: {
          select: {
            registrations: true,
            speakers: true,
            waitlist: true,
            demoDaySubmissions: true,
          },
        },
      },
    })

    if (!event) {
      throw new Error('Event not found')
    }

     
    if (event.type === 'DEMO_DAY' && userId) {
      const userSubmission = await prisma.demoDaySubmission.findFirst({
        where: {
          eventId: eventId,
          submitterId: userId
        },
        select: {
          id: true,
          projectTitle: true,
          submittedAt: true,
        }
      })
      
     
      event.userSubmission = userSubmission
    }

    return event
  } catch (error) {
    logger.error('Failed to find event', { eventId, error: error.message })
    throw new Error('Event not found')
  }
}

  /**
   * Check if user has already submitted to a demo day
   * @param {string} eventId - The demo day event ID
   * @param {string} userId - The user ID
   * @returns {boolean} - Whether user has submitted
   */
  static async hasUserSubmitted(eventId, userId) {
    try {
      const submission = await prisma.demoDaySubmission.findUnique({
        where: {
          eventId_submitterId: {
            eventId: eventId,
            submitterId: userId
          }
        }
      })

      return !!submission
    } catch (error) {
      logger.error('Failed to check user submission', { eventId, userId, error: error.message })
      return false
    }
  }

  /**
   * Find events by workspace with filters
   */
  static async findByWorkspace(workspaceId, filters = {}) {
    try {
      const { search, type, status, date, isPublic, creatorId, page = 1, limit = 50 } = filters

      const where = {
        workspaceId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(type && type !== 'all' && { type }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(creatorId && { creatorId }),
      }

      // Date filters
      const now = new Date()
      if (status === 'upcoming') {
        where.startDate = { gt: now }
      } else if (status === 'ongoing') {
        where.startDate = { lte: now }
        where.endDate = { gte: now }
      } else if (status === 'completed') {
        where.endDate = { lt: now }
      }

      if (date && date !== 'all') {
        const dateFilters = this.getDateFilters(date)
        if (dateFilters) {
          where.startDate = { ...where.startDate, ...dateFilters }
        }
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            speakers: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
                isExternal: true,
              },
              orderBy: { order: 'asc' },
              take: 5,
            },
            _count: {
              select: {
                registrations: true,
                speakers: true,
              },
            },
          },
          orderBy: { startDate: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.event.count({ where }),
      ])

      // Calculate stats
      const stats = await this.getWorkspaceEventStats(workspaceId)

      return {
        events,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        stats,
      }
    } catch (error) {
      logger.error('Failed to find events by workspace', {
        workspaceId,
        filters,
        error: error.message,
      })
      throw new Error('Failed to fetch events')
    }
  }

  /**
   * Update event
   */
  static async update(eventId, eventData, userId) {
    try {
      const { speakers = [], resources = [], accessRules = [], ...baseEventData } = eventData

      return await prisma.$transaction(async tx => {
        // Get existing event
        const existingEvent = await tx.event.findUnique({
          where: { id: eventId },
          include: { speakers: true, resources: true, accessRules: true },
        })

        if (!existingEvent) {
          throw new Error('Event not found')
        }

        let virtualLink = baseEventData.virtualLink || existingEvent.virtualLink
        let zoomMeetingId = existingEvent.zoomMeetingId
        let meetingPassword = existingEvent.meetingPassword

        // Handle Zoom meeting updates
        if (baseEventData.isVirtual) {
          if (existingEvent.zoomMeetingId) {
            // Update existing Zoom meeting
            try {
              await ZoomService.updateMeeting(existingEvent.zoomMeetingId, {
                topic: baseEventData.title,
                start_time: baseEventData.startDate,
                duration: Math.ceil(
                  (new Date(baseEventData.endDate) - new Date(baseEventData.startDate)) /
                    (1000 * 60)
                ),
                timezone: baseEventData.timezone || 'UTC',
                settings: {
                  waiting_room: baseEventData.waitingRoom,
                  auto_recording: baseEventData.autoRecord ? 'cloud' : 'none',
                },
              })

              logger.info('Zoom meeting updated', { zoomMeetingId: existingEvent.zoomMeetingId })
            } catch (zoomError) {
              logger.warn('Failed to update Zoom meeting', { error: zoomError.message })
            }
          } else if (!existingEvent.zoomMeetingId && !virtualLink) {
            // Create new Zoom meeting if switching to virtual
            try {
              const zoomMeeting = await ZoomService.createMeeting({
                topic: baseEventData.title,
                start_time: baseEventData.startDate,
                duration: Math.ceil(
                  (new Date(baseEventData.endDate) - new Date(baseEventData.startDate)) /
                    (1000 * 60)
                ),
                timezone: baseEventData.timezone || 'UTC',
                settings: {
                  waiting_room: baseEventData.waitingRoom,
                  auto_recording: baseEventData.autoRecord ? 'cloud' : 'none',
                  join_before_host: false,
                  mute_upon_entry: true,
                },
              })

              zoomMeetingId = zoomMeeting.id
              meetingPassword = zoomMeeting.password
              virtualLink = zoomMeeting.join_url

              logger.info('New Zoom meeting created for updated event', {
                eventId,
                zoomMeetingId,
              })
            } catch (zoomError) {
              logger.warn('Failed to create new Zoom meeting', { error: zoomError.message })
            }
          }
        } else if (!baseEventData.isVirtual && existingEvent.zoomMeetingId) {
          // Delete Zoom meeting if switching from virtual to physical
          try {
            await ZoomService.deleteMeeting(existingEvent.zoomMeetingId)
            zoomMeetingId = null
            meetingPassword = null
            virtualLink = null

            logger.info('Zoom meeting deleted for event switch to physical', {
              eventId,
              deletedZoomMeetingId: existingEvent.zoomMeetingId,
            })
          } catch (zoomError) {
            logger.warn('Failed to delete Zoom meeting', { error: zoomError.message })
          }
        }

        // Update the event
        const updatedEvent = await tx.event.update({
          where: { id: eventId },
          data: {
            ...baseEventData,
            virtualLink,
            zoomMeetingId,
            meetingPassword,
          },
        })

        // Update speakers
        await tx.eventSpeaker.deleteMany({ where: { eventId } })
        if (speakers.length > 0) {
          await tx.eventSpeaker.createMany({
            data: speakers.map((speaker, index) => ({
              eventId,
              ...speaker,
              order: index,
            })),
          })
        }

        // Update access rules
        await tx.eventAccess.deleteMany({ where: { eventId } })
        if (accessRules.length > 0) {
          await tx.eventAccess.createMany({
            data: accessRules.map(rule => ({
              eventId,
              ...rule,
            })),
          })
        }

        logger.info('Event updated', { eventId, userId })

        return this.findById(eventId)
      })
    } catch (error) {
      logger.error('Failed to update event', { eventId, error: error.message })
      throw new Error(error.message || 'Failed to update event')
    }
  }

  /**
   * Delete event
   */
  static async delete(eventId, userId) {
    try {
      return await prisma.$transaction(async tx => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          select: { zoomMeetingId: true, title: true },
        })

        if (!event) {
          throw new Error('Event not found')
        }

        // Delete Zoom meeting if exists
        if (event.zoomMeetingId) {
          try {
            await ZoomService.deleteMeeting(event.zoomMeetingId)
            logger.info('Zoom meeting deleted', { zoomMeetingId: event.zoomMeetingId })
          } catch (zoomError) {
            logger.warn('Failed to delete Zoom meeting', { error: zoomError.message })
          }
        }

        // Delete the event (cascade will handle related records)
        await tx.event.delete({ where: { id: eventId } })

        logger.info('Event deleted', { eventId, userId, eventTitle: event.title })

        return { success: true }
      })
    } catch (error) {
      logger.error('Failed to delete event', { eventId, error: error.message })
      throw new Error(error.message || 'Failed to delete event')
    }
  }
static async createDemoDayConfig(eventId, configData, userId) {
  try {
    const config = await prisma.demoDayConfig.create({
      data: {
        eventId,
        ...configData,
      },
    })

    logger.info('Demo day config created', { eventId, configId: config.id, userId })
    return config
  } catch (error) {
    logger.error('Failed to create demo day config', { eventId, error: error.message })
    throw new Error('Failed to create demo day configuration')
  }
}

  /**
   * Create a demo day submission
   * @param {string} eventId - The demo day event ID
   * @param {string} userId - The user ID
   * @param {object} submissionData - The submission data
   */
  static async createDemoDaySubmission(eventId, userId, submissionData) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Check if event exists and is a demo day
        const event = await tx.event.findUnique({
          where: { id: eventId },
          include: {
            demoDayConfig: true
          }
        })

        if (!event) {
          throw new Error('Event not found')
        }

        if (event.type !== 'DEMO_DAY') {
          throw new Error('This is not a demo day event')
        }

        // Check if submission deadline has passed
        if (event.demoDayConfig?.submissionDeadline) {
          const deadline = new Date(event.demoDayConfig.submissionDeadline)
          const now = new Date()
          
          if (now > deadline && !event.demoDayConfig.allowLateSubmissions) {
            throw new Error('Submission deadline has passed')
          }
        }

        // Check if user has already submitted (this will throw an error due to unique constraint)
        const existingSubmission = await tx.demoDaySubmission.findUnique({
          where: {
            eventId_submitterId: {
              eventId: eventId,
              submitterId: userId
            }
          }
        })

        if (existingSubmission) {
          throw new Error('You have already submitted to this demo day')
        }

        // Create the submission
        const submission = await tx.demoDaySubmission.create({
          data: {
            eventId,
            submitterId: userId,
            projectTitle: submissionData.projectTitle,
            description: submissionData.description,
            category: submissionData.category,
            stage: submissionData.stage,
            submissionUrl: submissionData.submissionUrl,
          },
        })

        // Add resources if provided
        if (submissionData.resources && submissionData.resources.length > 0) {
          await tx.demoDaySubmissionResource.createMany({
            data: submissionData.resources.map((resource, index) => ({
              submissionId: submission.id,
              type: resource.type,
              title: resource.title,
              url: resource.url,
              description: resource.description,
              order: index,
            }))
          })
        }

        logger.info('Demo day submission created', {
          eventId,
          userId,
          submissionId: submission.id,
          projectTitle: submissionData.projectTitle
        })

        return submission
      })
    } catch (error) {
      logger.error('Failed to create demo day submission', { 
        eventId, 
        userId, 
        error: error.message 
      })
      throw new Error(error.message || 'Failed to create submission')
    }
  }

 
static async updateDemoDayConfig(eventId, configData, userId) {
  try {
    const config = await prisma.demoDayConfig.upsert({
      where: { eventId },
      update: configData,
      create: {
        eventId,
        ...configData,
      },
    })

    logger.info('Demo day config updated', { eventId, configId: config.id, userId })
    return config
  } catch (error) {
    logger.error('Failed to update demo day config', { eventId, error: error.message })
    throw new Error('Failed to update demo day configuration')
  }
}
 
static async assignJudges(eventId, judges, userId) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Remove existing judges
      await tx.demoDayJudge.deleteMany({
        where: { eventId }
      })

      // Add new judges
      if (judges.length > 0) {
        await tx.demoDayJudge.createMany({
          data: judges.map(judge => ({
            eventId,
            ...judge,
          }))
        })
      }

      logger.info('Judges assigned to demo day', { eventId, judgeCount: judges.length, userId })
      return { success: true }
    })
  } catch (error) {
    logger.error('Failed to assign judges', { eventId, error: error.message })
    throw new Error('Failed to assign judges')
  }
}
 
  static async registerUser(eventId, userId, invitedBy = null) {
    try {
      return await prisma.$transaction(async tx => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          include: {
            registrations: true,
            waitlist: true,
            _count: { select: { registrations: true } },
          },
        })

        if (!event) {
          throw new Error('Event not found')
        }

        // Check if already registered
        const existingRegistration = await tx.eventRegistration.findUnique({
          where: { eventId_userId: { eventId, userId } },
        })

        if (existingRegistration) {
          throw new Error('Already registered for this event')
        }

        // Check capacity
        const isAtCapacity = event.maxAttendees && event._count.registrations >= event.maxAttendees

        if (isAtCapacity) {
          // Add to waitlist
          const waitlistPosition = await tx.eventWaitlist.count({
            where: { eventId },
          })

          const waitlistEntry = await tx.eventWaitlist.create({
            data: {
              eventId,
              userId,
              position: waitlistPosition + 1,
            },
          })

          logger.info('User added to event waitlist', {
            eventId,
            userId,
            position: waitlistEntry.position,
          })

          return { type: 'waitlist', position: waitlistEntry.position }
        }

        // Create registration
        const registration = await tx.eventRegistration.create({
          data: {
            eventId,
            userId,
            invitedBy,
            invitedAt: invitedBy ? new Date() : null,
            status: 'REGISTERED',
            responseStatus: 'ACCEPTED',
          },
        })

        // // Send confirmation notification
        // await NotificationService.create({
        //   workspaceId: event.workspaceId,
        //   userId,
        //   type: 'EVENT',
        //   title: 'Event Registration Confirmed',
        //   message: `You have successfully registered for "${event.title}"`,
        //   actionUrl: `/events/${eventId}`,
        // })

        logger.info('User registered for event', {
          eventId,
          userId,
          registrationId: registration.id,
        })

        return { type: 'registration', registration }
      })
    } catch (error) {
      logger.error('Failed to register user for event', { eventId, userId, error: error.message })
      throw new Error(error.message || 'Failed to register for event')
    }
  }
 
  static async cancelRegistration(eventId, userId) {
    try {
      return await prisma.$transaction(async tx => {
        const registration = await tx.eventRegistration.findUnique({
          where: { eventId_userId: { eventId, userId } },
        })

        if (!registration) {
          throw new Error('Registration not found')
        }

        // Delete registration
        await tx.eventRegistration.delete({
          where: { id: registration.id },
        })

        // Promote from waitlist if available
        const nextWaitlistEntry = await tx.eventWaitlist.findFirst({
          where: { eventId },
          orderBy: { position: 'asc' },
          include: { user: true },
        })

        if (nextWaitlistEntry) {
          await tx.eventRegistration.create({
            data: {
              eventId,
              userId: nextWaitlistEntry.userId,
              status: 'REGISTERED',
              responseStatus: 'ACCEPTED',
            },
          })

          await tx.eventWaitlist.delete({
            where: { id: nextWaitlistEntry.id },
          })

          // Update remaining waitlist positions
          await tx.eventWaitlist.updateMany({
            where: { eventId, position: { gt: nextWaitlistEntry.position } },
            data: { position: { decrement: 1 } },
          })

          // Notify promoted user
          // await NotificationService.create({
          //   workspaceId: registration.event?.workspaceId,
          //   userId: nextWaitlistEntry.userId,
          //   type: 'EVENT',
          //   title: 'Promoted from Waitlist',
          //   message: `You've been registered for the event from the waitlist`,
          //   actionUrl: `/events/${eventId}`,
          // })
        }

        logger.info('Event registration cancelled', { eventId, userId })

        return { success: true }
      })
    } catch (error) {
      logger.error('Failed to cancel registration', { eventId, userId, error: error.message })
      throw new Error(error.message || 'Failed to cancel registration')
    }
  }

  /**
   * Get workspace event statistics
   */
  static async getWorkspaceEventStats(workspaceId) {
    try {
      const now = new Date()

      const [total, upcoming, ongoing, completed] = await Promise.all([
        prisma.event.count({ where: { workspaceId } }),
        prisma.event.count({
          where: { workspaceId, startDate: { gt: now } },
        }),
        prisma.event.count({
          where: {
            workspaceId,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        }),
        prisma.event.count({
          where: { workspaceId, endDate: { lt: now } },
        }),
      ])

      return { total, upcoming, ongoing, completed }
    } catch (error) {
      logger.error('Failed to get event stats', { workspaceId, error: error.message })
      return { total: 0, upcoming: 0, ongoing: 0, completed: 0 }
    }
  }

  /**
   * Helper method to get date filters
   */
  static getDateFilters(dateFilter) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    switch (dateFilter) {
      case 'today':
        return { gte: startOfDay, lt: endOfDay }
      case 'week':
        const startOfWeek = new Date(
          startOfDay.getTime() - startOfDay.getDay() * 24 * 60 * 60 * 1000
        )
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
        return { gte: startOfWeek, lt: endOfWeek }
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        return { gte: startOfMonth, lt: endOfMonth }
      case 'quarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
        const startOfQuarter = new Date(now.getFullYear(), quarterStartMonth, 1)
        const endOfQuarter = new Date(now.getFullYear(), quarterStartMonth + 3, 1)
        return { gte: startOfQuarter, lt: endOfQuarter }
      default:
        return null
    }
  }

  /**
   * Check if user has access to event
   */
  static async checkEventAccess(eventId, userId) {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          accessRules: true,
          workspace: {
            include: {
              members: {
                where: { userId },
                include: { role: true },
              },
            },
          },
        },
      })

      if (!event) return false

      // If event is public, anyone can access
      if (event.isPublic) return true

      // Check if user is workspace member
      const member = event.workspace.members[0]
      if (!member) return false

      // If no access rules, all workspace members can access
      if (event.accessRules.length === 0) return true

      // Check specific access rules
      return event.accessRules.some(rule => {
        if (rule.userId === userId) return true
        if (rule.roleId === member.roleId) return true
        return false
      })
    } catch (error) {
      logger.error('Failed to check event access', { eventId, userId, error: error.message })
      return false
    }
  }
}
