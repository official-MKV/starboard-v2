import { prisma } from '../database'

export class MentorshipService {
  // ==================== ASSIGNMENTS ====================

  /**
   * Get assignments for workspace with enhanced filtering
   */
  static async getAssignments(workspaceId, filters = {}) {
    const { mentorId, menteeId, status, userId, search } = filters

    const where = {
      workspaceId,
      ...(mentorId && { mentorId }),
      ...(menteeId && { menteeId }),
      ...(status && { status }),
      ...(userId && {
        OR: [{ mentorId: userId }, { menteeId: userId }],
      }),
      ...(search && {
        OR: [
          { mentor: { firstName: { contains: search, mode: 'insensitive' } } },
          { mentor: { lastName: { contains: search, mode: 'insensitive' } } },
          { mentor: { email: { contains: search, mode: 'insensitive' } } },
          { mentee: { firstName: { contains: search, mode: 'insensitive' } } },
          { mentee: { lastName: { contains: search, mode: 'insensitive' } } },
          { mentee: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    }

    const assignments = await prisma.mentorshipAssignment.findMany({
      where,
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            company: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            company: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        meetings: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            wasProductive: true,
            rating: true,
          },
          orderBy: { startTime: 'desc' },
          take: 5,
        },
        _count: {
          select: { meetings: true, history: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return assignments
  }

  /**
   * Create a new mentorship assignment with enhanced validation
   */
  static async createAssignment(workspaceId, assignmentData, userId) {
    const { mentorId, menteeId, notes } = assignmentData

    // ✅ Enhanced validation with role checking
    await this.validateAssignmentEligibility(workspaceId, mentorId, menteeId)

    // Check if active assignment already exists
    const existingAssignment = await prisma.mentorshipAssignment.findFirst({
      where: {
        workspaceId,
        mentorId,
        menteeId,
        status: 'ACTIVE',
      },
    })

    if (existingAssignment) {
      throw new Error('Active assignment already exists between these users')
    }

    // Check if mentee already has an active mentor
    const existingMentee = await prisma.mentorshipAssignment.findFirst({
      where: {
        workspaceId,
        menteeId,
        status: 'ACTIVE',
      },
    })

    if (existingMentee) {
      throw new Error('Mentee already has an active mentor')
    }

    // Calculate next meeting due date (30 days from now)
    const nextMeetingDue = new Date()
    nextMeetingDue.setDate(nextMeetingDue.getDate() + 30)

    const assignment = await prisma.mentorshipAssignment.create({
      data: {
        workspaceId,
        mentorId,
        menteeId,
        notes,
        nextMeetingDue,
        createdById: userId,
      },
      include: {
        mentor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        mentee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Create history record
    await this.createHistoryRecord(
      assignment.id,
      'ASSIGNED',
      null,
      {
        mentorId,
        menteeId,
        notes,
      },
      userId
    )

    return assignment
  }

  /**
   * ✅ FIXED: Validate if users are eligible for mentorship assignment based on roles
   */
  static async validateAssignmentEligibility(workspaceId, mentorId, menteeId) {
    // Get both users and their workspace membership info separately
    const [mentorMember, menteeMember, mentorUser, menteeUser] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: mentorId },
        include: {
          role: {
            select: { canMentor: true, name: true },
          },
        },
      }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: menteeId },
        include: {
          role: {
            select: { canBeMentee: true, name: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: mentorId },
        select: { firstName: true, lastName: true },
      }),
      prisma.user.findUnique({
        where: { id: menteeId },
        select: { firstName: true, lastName: true },
      }),
    ])

    if (!mentorMember || !mentorUser) {
      throw new Error('Mentor is not a member of this workspace')
    }

    if (!menteeMember || !menteeUser) {
      throw new Error('Mentee is not a member of this workspace')
    }

    if (!mentorMember.role.canMentor) {
      throw new Error(
        `User ${mentorUser.firstName} ${mentorUser.lastName} does not have mentor capabilities (Role: ${mentorMember.role.name})`
      )
    }

    if (!menteeMember.role.canBeMentee) {
      throw new Error(
        `User ${menteeUser.firstName} ${menteeUser.lastName} does not have mentee capabilities (Role: ${menteeMember.role.name})`
      )
    }

    return true
  }

  /**
   * ✅ FIXED: Get users eligible to be mentors based on role capabilities
   */
  static async getEligibleMentors(workspaceId, search = '') {
    const mentors = await prisma.user.findMany({
      where: {
        workspaceMembers: {
          // ✅ Fixed: was 'memberships'
          some: {
            workspaceId,
            role: {
              canMentor: true,
            },
          },
        },
        isActive: true,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        jobTitle: true,
        company: true,
        workspaceMembers: {
          // ✅ Fixed: was 'memberships'
          where: { workspaceId },
          select: {
            role: {
              select: { name: true, color: true },
            },
          },
        },
        // Include mentorship stats
        mentorAssignments: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    })

    // Add mentorship stats to each mentor
    return mentors.map(mentor => ({
      ...mentor,
      role: mentor.workspaceMembers[0]?.role, // ✅ Fixed: was 'memberships'
      activeMenteeCount: mentor.mentorAssignments.length,
      workspaceMembers: undefined, // Remove from response
      mentorAssignments: undefined, // Remove from response
    }))
  }

  /**
   * ✅ FIXED: Get users eligible to be mentees based on role capabilities
   */
  static async getEligibleMentees(workspaceId, search = '') {
    const mentees = await prisma.user.findMany({
      where: {
        workspaceMembers: {
          // ✅ Fixed: was 'memberships'
          some: {
            workspaceId,
            role: {
              canBeMentee: true,
            },
          },
        },
        isActive: true,
        // Only users without active mentors
        NOT: {
          menteeAssignments: {
            some: {
              workspaceId,
              status: 'ACTIVE',
            },
          },
        },
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        jobTitle: true,
        company: true,
        workspaceMembers: {
          // ✅ Fixed: was 'memberships'
          where: { workspaceId },
          select: {
            role: {
              select: { name: true, color: true },
            },
          },
        },
      },
    })

    return mentees.map(mentee => ({
      ...mentee,
      role: mentee.workspaceMembers[0]?.role, // ✅ Fixed: was 'memberships'
      workspaceMembers: undefined, // Remove from response
    }))
  }

  // ==================== MEETING TRACKING ====================

  /**
   * ✅ NEW: Create a meeting record for mentorship
   */
  static async createMeeting(workspaceId, meetingData, createdBy) {
    const { assignmentId, title, startTime, endTime, description, location, virtualLink, agenda } =
      meetingData

    // Validate assignment exists
    const assignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
      include: {
        mentor: { select: { id: true } },
        mentee: { select: { id: true } },
      },
    })

    if (!assignment) {
      throw new Error('Mentorship assignment not found')
    }

    // Get the current meeting number
    const meetingCount = await prisma.meeting.count({
      where: { assignmentId },
    })

    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        title,
        description,
        startTime,
        endTime,
        location,
        virtualLink,
        agenda,
        type: 'MENTORSHIP',
        status: 'SCHEDULED',
        organizerId: createdBy,
        assignmentId,
        meetingNumber: meetingCount + 1,
        participants: [assignment.mentorId, assignment.menteeId],
        createdBy,
      },
      include: {
        organizer: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    return meeting
  }

  /**
   * ✅ ENHANCED: Update meeting tracking when a meeting is completed
   */
  static async completeMeeting(meetingId, workspaceId, completionData, userId) {
    const { notes, wasProductive, rating, actionItems } = completionData

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      include: {
        assignment: true,
      },
    })

    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // Update the meeting
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'COMPLETED',
        notes,
        wasProductive,
        rating,
        actionItems,
        endTime: new Date(), // Set actual end time
      },
    })

    // Update assignment meeting tracking if this is linked to an assignment
    if (meeting.assignmentId) {
      await this.updateMeetingTracking(meeting.assignmentId, workspaceId)
    }

    return updatedMeeting
  }

  /**
   * ✅ ENHANCED: Update meeting tracking when a meeting is completed
   */
  static async updateMeetingTracking(assignmentId, workspaceId) {
    const assignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    // Get the latest completed meeting
    const latestMeeting = await prisma.meeting.findFirst({
      where: {
        assignmentId,
        status: 'COMPLETED',
      },
      orderBy: { startTime: 'desc' },
    })

    // Calculate next meeting due date (30 days from last meeting or now)
    const baseDate = latestMeeting ? new Date(latestMeeting.startTime) : new Date()
    const nextMeetingDue = new Date(baseDate)
    nextMeetingDue.setDate(nextMeetingDue.getDate() + 30)

    // Count total completed meetings
    const totalMeetings = await prisma.meeting.count({
      where: {
        assignmentId,
        status: 'COMPLETED',
      },
    })

    const updatedAssignment = await prisma.mentorshipAssignment.update({
      where: { id: assignmentId },
      data: {
        totalMeetings,
        lastMeetingAt: latestMeeting?.startTime || new Date(),
        nextMeetingDue,
      },
    })

    // Create history record
    await this.createHistoryRecord(
      assignmentId,
      'MEETING_COMPLETED',
      null,
      {
        meetingCompletedAt: new Date(),
        totalMeetings: updatedAssignment.totalMeetings,
        meetingId: latestMeeting?.id,
      },
      assignment.createdById
    )

    return updatedAssignment
  }

  /**
   * ✅ ENHANCED: Get assignments overdue for meetings with more details
   */
  static async getOverdueMeetings(workspaceId) {
    const overdueAssignments = await prisma.mentorshipAssignment.findMany({
      where: {
        workspaceId,
        status: 'ACTIVE',
        nextMeetingDue: { lt: new Date() },
      },
      include: {
        mentor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        mentee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        meetings: {
          where: { status: 'COMPLETED' },
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { startTime: true },
        },
      },
      orderBy: { nextMeetingDue: 'asc' },
    })

    return overdueAssignments.map(assignment => ({
      ...assignment,
      daysPastDue: Math.floor(
        (new Date() - new Date(assignment.nextMeetingDue)) / (1000 * 60 * 60 * 24)
      ),
      lastMeetingDate: assignment.meetings[0]?.startTime || null,
    }))
  }

  /**
   * ✅ ENHANCED: Get mentorship statistics with meeting data
   */
  static async getStatistics(workspaceId) {
    const [
      totalAssignments,
      activeAssignments,
      pausedAssignments,
      terminatedAssignments,
      totalMentors,
      totalMentees,
      assignmentsWithMeetings,
      overdueAssignments,
      totalMeetings,
      completedMeetings,
      averageMeetingsPerAssignment,
    ] = await Promise.all([
      prisma.mentorshipAssignment.count({
        where: { workspaceId },
      }),
      prisma.mentorshipAssignment.count({
        where: { workspaceId, status: 'ACTIVE' },
      }),
      prisma.mentorshipAssignment.count({
        where: { workspaceId, status: 'PAUSED' },
      }),
      prisma.mentorshipAssignment.count({
        where: { workspaceId, status: 'TERMINATED' },
      }),
      prisma.mentorshipAssignment
        .findMany({
          where: { workspaceId, status: 'ACTIVE' },
          select: { mentorId: true },
          distinct: ['mentorId'],
        })
        .then(results => results.length),
      prisma.mentorshipAssignment
        .findMany({
          where: { workspaceId, status: 'ACTIVE' },
          select: { menteeId: true },
          distinct: ['menteeId'],
        })
        .then(results => results.length),
      prisma.mentorshipAssignment.count({
        where: { workspaceId, totalMeetings: { gt: 0 } },
      }),
      prisma.mentorshipAssignment.count({
        where: {
          workspaceId,
          status: 'ACTIVE',
          nextMeetingDue: { lt: new Date() },
        },
      }),
      prisma.meeting.count({
        where: { workspaceId, type: 'MENTORSHIP' },
      }),
      prisma.meeting.count({
        where: { workspaceId, type: 'MENTORSHIP', status: 'COMPLETED' },
      }),
      prisma.meeting
        .aggregate({
          where: { workspaceId, type: 'MENTORSHIP', status: 'COMPLETED' },
          _avg: { meetingNumber: true },
        })
        .then(result => result._avg.meetingNumber || 0),
    ])

    return {
      totalAssignments,
      activeAssignments,
      pausedAssignments,
      terminatedAssignments,
      totalMentors,
      totalMentees,
      assignmentsWithMeetings,
      overdueAssignments,
      totalMeetings,
      completedMeetings,
      averageMeetingsPerAssignment: Math.round(averageMeetingsPerAssignment * 10) / 10,
      meetingCompletionRate:
        totalAssignments > 0 ? Math.round((assignmentsWithMeetings / totalAssignments) * 100) : 0,
      meetingAttendanceRate:
        totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0,
    }
  }

  /**
   * Update a mentorship assignment
   */
  static async updateAssignment(assignmentId, workspaceId, updates, userId) {
    const existingAssignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    })

    if (!existingAssignment) {
      throw new Error('Mentorship assignment not found')
    }

    const { status, notes } = updates
    const previousData = {
      status: existingAssignment.status,
      notes: existingAssignment.notes,
    }

    const assignment = await prisma.mentorshipAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true, email: true } },
        mentee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Create history record for significant changes
    if (status && status !== existingAssignment.status) {
      await this.createHistoryRecord(
        assignmentId,
        'STATUS_CHANGED',
        previousData,
        {
          status,
          reason: updates.reason,
        },
        userId
      )
    }

    if (notes !== undefined && notes !== existingAssignment.notes) {
      await this.createHistoryRecord(
        assignmentId,
        'NOTES_UPDATED',
        previousData,
        {
          notes,
        },
        userId
      )
    }

    return assignment
  }

  /**
   * Reassign mentor or mentee
   */
  static async reassignMentorship(assignmentId, workspaceId, reassignmentData, userId) {
    const { newMentorId, newMenteeId, reason } = reassignmentData

    const existingAssignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true } },
        mentee: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!existingAssignment) {
      throw new Error('Mentorship assignment not found')
    }

    // Validate new assignments if provided
    if (newMentorId && newMentorId !== existingAssignment.mentorId) {
      const finalMenteeId = newMenteeId || existingAssignment.menteeId
      await this.validateAssignmentEligibility(workspaceId, newMentorId, finalMenteeId)
    }

    if (newMenteeId && newMenteeId !== existingAssignment.menteeId) {
      const finalMentorId = newMentorId || existingAssignment.mentorId
      await this.validateAssignmentEligibility(workspaceId, finalMentorId, newMenteeId)
    }

    // If reassigning mentee, check if new mentee already has a mentor
    if (newMenteeId && newMenteeId !== existingAssignment.menteeId) {
      const existingMentee = await prisma.mentorshipAssignment.findFirst({
        where: {
          workspaceId,
          menteeId: newMenteeId,
          status: 'ACTIVE',
        },
      })

      if (existingMentee) {
        throw new Error('New mentee already has an active mentor')
      }
    }

    const previousData = {
      mentorId: existingAssignment.mentorId,
      menteeId: existingAssignment.menteeId,
    }

    const assignment = await prisma.mentorshipAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(newMentorId && { mentorId: newMentorId }),
        ...(newMenteeId && { menteeId: newMenteeId }),
      },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true, email: true } },
        mentee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    // Create history record
    await this.createHistoryRecord(
      assignmentId,
      'REASSIGNED',
      previousData,
      {
        newMentorId,
        newMenteeId,
        reason,
      },
      userId
    )

    return assignment
  }

  /**
   * Terminate an assignment
   */
  static async terminateAssignment(assignmentId, workspaceId, userId, reason) {
    const assignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
      include: {
        mentor: { select: { firstName: true, lastName: true } },
        mentee: { select: { firstName: true, lastName: true } },
      },
    })

    if (!assignment) {
      throw new Error('Mentorship assignment not found')
    }

    // Update status to TERMINATED
    const updatedAssignment = await prisma.mentorshipAssignment.update({
      where: { id: assignmentId },
      data: { status: 'TERMINATED' },
    })

    // Create history record
    await this.createHistoryRecord(
      assignmentId,
      'TERMINATED',
      null,
      {
        reason,
        terminatedAt: new Date(),
      },
      userId
    )

    return updatedAssignment
  }

  /**
   * Create a history record
   */
  static async createHistoryRecord(assignmentId, action, previousData, newData, userId) {
    return await prisma.mentorshipHistory.create({
      data: {
        assignmentId,
        action,
        previousData,
        newData,
        createdById: userId,
      },
    })
  }

  /**
   * Get assignment history
   */
  static async getAssignmentHistory(assignmentId, workspaceId) {
    const assignment = await prisma.mentorshipAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    const history = await prisma.mentorshipHistory.findMany({
      where: { assignmentId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return history
  }
}
