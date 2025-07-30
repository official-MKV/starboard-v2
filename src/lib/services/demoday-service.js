// lib/services/demoday-service.js
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export class DemoDayService {
  /**
   * Create submission
   */
  static async createSubmission(eventId, submissionData, userId) {
    try {
      
     

      const submission = await prisma.demoDaySubmission.create({
        data: {
          eventId,
         
          ...submissionData,
        },
       
      })

      logger.info('Demo day submission created', { 
        submissionId: submission.id, 
        eventId, 
        userId 
      })

      return submission
    } catch (error) {
      logger.error('Failed to create submission', { eventId, userId, error: error.message })
      throw new Error(error.message || 'Failed to create submission')
    }
  }

  /**
   * Submit final submission
   */
  static async submitSubmission(submissionId, userId) {
    try {
      const submission = await prisma.demoDaySubmission.findFirst({
        where: { 
          id: submissionId, 
          submitterId: userId 
        },
        include: {
          event: {
            include: {
              demoDayConfig: true
            }
          }
        }
      })

      if (!submission) {
        throw new Error('Submission not found')
      }

      // Check deadline
      const config = submission.event.demoDayConfig
      if (config && new Date() > new Date(config.submissionDeadline)) {
        if (!config.allowLateSubmissions) {
          throw new Error('Submission deadline has passed')
        }
      }

      const updatedSubmission = await prisma.demoDaySubmission.update({
        where: { id: submissionId },
        data: {
          isSubmitted: true,
          submittedAt: new Date(),
        }
      })

      logger.info('Demo day submission submitted', { submissionId, userId })
      return updatedSubmission
    } catch (error) {
      logger.error('Failed to submit submission', { submissionId, userId, error: error.message })
      throw new Error(error.message || 'Failed to submit submission')
    }
  }

  /**
   * Score submission
   */
  static async scoreSubmission(submissionId, judgeId, scoreData) {
    try {
      const score = await prisma.judgeScore.upsert({
        where: {
          submissionId_judgeId: {
            submissionId,
            judgeId,
          }
        },
        update: {
          ...scoreData,
          scoredAt: new Date(),
        },
        create: {
          submissionId,
          judgeId,
          eventId: scoreData.eventId,
          ...scoreData,
          scoredAt: new Date(),
        }
      })

      // Recalculate submission totals
      await this.recalculateSubmissionScores(submissionId)

      logger.info('Submission scored', { submissionId, judgeId, scoreId: score.id })
      return score
    } catch (error) {
      logger.error('Failed to score submission', { submissionId, judgeId, error: error.message })
      throw new Error('Failed to score submission')
    }
  }

  /**
   * Get live rankings
   */
  static async getLiveRankings(eventId) {
    try {
      const submissions = await prisma.demoDaySubmission.findMany({
        where: {
          eventId,
          isSubmitted: true,
        },
        include: {
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            }
          },
          scores: {
            where: { isComplete: true },
            include: {
              judge: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          _count: {
            select: { 
              scores: { where: { isComplete: true } } 
            }
          }
        },
        orderBy: [
          { averageScore: 'desc' },
          { submittedAt: 'asc' }
        ]
      })

      // Update rankings
      const rankedSubmissions = submissions.map((submission, index) => ({
        ...submission,
        rank: index + 1
      }))

      return rankedSubmissions
    } catch (error) {
      logger.error('Failed to get live rankings', { eventId, error: error.message })
      throw new Error('Failed to get live rankings')
    }
  }

  /**
   * Check if user can submit
   */
  static async canUserSubmit(eventId, userId) {
    try {
      // Check if user has startup role
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspace: {
            events: {
              some: { id: eventId }
            }
          }
        },
        include: {
          role: true
        }
      })

      if (!member || member.role.name !== 'startup') {
        return { allowed: false, reason: 'Only startups can submit to demo day' }
      }

      // Check if already submitted
      const existingSubmission = await prisma.demoDaySubmission.findUnique({
        where: {
          eventId_submitterId: {
            eventId,
            submitterId: userId,
          }
        }
      })

      if (existingSubmission) {
        return { allowed: false, reason: 'Already submitted to this demo day' }
      }

      // Check deadline
      const config = await prisma.demoDayConfig.findUnique({
        where: { eventId }
      })

      if (config && new Date() > new Date(config.submissionDeadline)) {
        if (!config.allowLateSubmissions) {
          return { allowed: false, reason: 'Submission deadline has passed' }
        }
      }

      return { allowed: true }
    } catch (error) {
      logger.error('Failed to check submission eligibility', { eventId, userId, error: error.message })
      return { allowed: false, reason: 'Failed to check eligibility' }
    }
  }

  /**
   * Recalculate submission scores
   */
  static async recalculateSubmissionScores(submissionId) {
    try {
      const scores = await prisma.judgeScore.findMany({
        where: { 
          submissionId,
          isComplete: true 
        },
        include: {
          judge: {
            include: {
              judgeAssignments: {
                where: { 
                  event: {
                    demoDaySubmissions: {
                      some: { id: submissionId }
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (scores.length === 0) return

      // Calculate weighted average
      const weightedTotal = scores.reduce((sum, score) => {
        const judgeWeight = score.judge.judgeAssignments[0]?.weight || 1.0
        return sum + (score.totalScore * judgeWeight)
      }, 0)

      const totalWeight = scores.reduce((sum, score) => {
        const judgeWeight = score.judge.judgeAssignments[0]?.weight || 1.0
        return sum + judgeWeight
      }, 0)

      const averageScore = weightedTotal / totalWeight

      await prisma.demoDaySubmission.update({
        where: { id: submissionId },
        data: {
          totalScore: weightedTotal,
          averageScore: averageScore,
        }
      })

      logger.info('Submission scores recalculated', { submissionId, averageScore })
    } catch (error) {
      logger.error('Failed to recalculate scores', { submissionId, error: error.message })
    }
  }

  /**
   * Get demo day statistics
   */
  static async getDemoDayStats(eventId) {
    try {
      const [
        totalSubmissions,
        submittedCount,
        totalJudges,
        totalScores,
        completedScores
      ] = await Promise.all([
        prisma.demoDaySubmission.count({
          where: { eventId }
        }),
        prisma.demoDaySubmission.count({
          where: { eventId, isSubmitted: true }
        }),
        prisma.demoDayJudge.count({
          where: { eventId }
        }),
        prisma.judgeScore.count({
          where: { eventId }
        }),
        prisma.judgeScore.count({
          where: { eventId, isComplete: true }
        })
      ])

      const judgingProgress = totalJudges > 0 && submittedCount > 0 
        ? (completedScores / (totalJudges * submittedCount)) * 100 
        : 0

      return {
        totalSubmissions,
        submittedCount,
        draftCount: totalSubmissions - submittedCount,
        totalJudges,
        totalScores,
        completedScores,
        judgingProgress: Math.round(judgingProgress)
      }
    } catch (error) {
      logger.error('Failed to get demo day stats', { eventId, error: error.message })
      return {
        totalSubmissions: 0,
        submittedCount: 0,
        draftCount: 0,
        totalJudges: 0,
        totalScores: 0,
        completedScores: 0,
        judgingProgress: 0
      }
    }
  }

  /**
   * Export results for demo day
   */
  static async exportResults(eventId) {
    try {
      const submissions = await prisma.demoDaySubmission.findMany({
        where: {
          eventId,
          isSubmitted: true,
        },
        include: {
          submitter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          scores: {
            where: { isComplete: true },
            include: {
              judge: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              }
            }
          }
        },
        orderBy: [
          { averageScore: 'desc' },
          { submittedAt: 'asc' }
        ]
      })

      const results = submissions.map((submission, index) => ({
        rank: index + 1,
        teamName: submission.teamName,
        projectTitle: submission.projectTitle,
        submitterName: `${submission.submitter.firstName} ${submission.submitter.lastName}`,
        submitterEmail: submission.submitter.email,
        category: submission.category,
        stage: submission.stage,
        averageScore: submission.averageScore,
        totalScore: submission.totalScore,
        judgeCount: submission.scores.length,
        submittedAt: submission.submittedAt,
        scores: submission.scores.map(score => ({
          judge: `${score.judge.firstName} ${score.judge.lastName}`,
          innovation: score.innovation,
          execution: score.execution,
          marketSize: score.marketSize,
          team: score.team,
          presentation: score.presentation,
          total: score.totalScore,
          feedback: score.feedback,
        }))
      }))

      logger.info('Demo day results exported', { eventId, submissionCount: results.length })
      return results
    } catch (error) {
      logger.error('Failed to export results', { eventId, error: error.message })
      throw new Error('Failed to export results')
    }
  }

  /**
   * Update results visibility
   */
  static async updateResultsVisibility(eventId, isPublic) {
    try {
      await prisma.demoDaySubmission.updateMany({
        where: { eventId },
        data: { isPublic }
      })

      logger.info('Results visibility updated', { eventId, isPublic })
      return { success: true }
    } catch (error) {
      logger.error('Failed to update results visibility', { eventId, error: error.message })
      throw new Error('Failed to update results visibility')
    }
  }

  /**
   * Get judging assignments for a judge
   */
  static async getJudgingAssignments(eventId, judgeId) {
    try {
      const judge = await prisma.demoDayJudge.findUnique({
        where: {
          eventId_judgeId: {
            eventId,
            judgeId,
          }
        }
      })

      if (!judge) {
        throw new Error('Judge not assigned to this demo day')
      }

      let whereClause = {
        eventId,
        isSubmitted: true,
      }

      // If judge has specific categories, filter by those
      if (judge.categories && judge.categories.length > 0) {
        whereClause.category = { in: judge.categories }
      }

      const submissions = await prisma.demoDaySubmission.findMany({
        where: whereClause,
        include: {
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            }
          },
          resources: {
            orderBy: { order: 'asc' }
          },
          scores: {
            where: { judgeId },
            select: {
              id: true,
              isComplete: true,
              totalScore: true,
              scoredAt: true,
            }
          }
        },
        orderBy: { submittedAt: 'asc' }
      })

      return submissions
    } catch (error) {
      logger.error('Failed to get judging assignments', { eventId, judgeId, error: error.message })
      throw new Error('Failed to get judging assignments')
    }
  }

  /**
   * Calculate final rankings with tie-breaking
   */
  static async calculateFinalRankings(eventId) {
    try {
      const submissions = await this.getLiveRankings(eventId)

      // Sort by score, then by submission time for tie-breaking
      const sortedSubmissions = submissions.sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore
        }
        // Tie-breaker: earlier submission wins
        return new Date(a.submittedAt) - new Date(b.submittedAt)
      })

      // Update rank in database
      await Promise.all(
        sortedSubmissions.map((submission, index) =>
          prisma.demoDaySubmission.update({
            where: { id: submission.id },
            data: { rank: index + 1 }
          })
        )
      )

      logger.info('Final rankings calculated', { eventId, submissionCount: sortedSubmissions.length })
      return sortedSubmissions
    } catch (error) {
      logger.error('Failed to calculate final rankings', { eventId, error: error.message })
      throw new Error('Failed to calculate final rankings')
    }
  }
}