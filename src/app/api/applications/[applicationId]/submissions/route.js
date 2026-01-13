import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { prisma } from '@/lib/database'
import { EvaluationService } from '@/lib/services/evaluation-service'

export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = await params

  try {
    logger.apiRequest('GET', `/api/applications/${applicationId}/submissions`)

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${applicationId}/submissions`, 401)
      return apiError('Unauthorized', 401)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Verify application exists and user has access
    const application = await applicationService.findById(applicationId)
    if (!application) {
      timer.log('GET', `/api/applications/${applicationId}/submissions`, 404)
      return apiError('Application not found', 404)
    }

    // Get submissions
    const submissions = await applicationService.findSubmissionsByApplication(applicationId, {
      status,
      search,
      page,
      limit,
    })

    // Get total count for pagination
    const totalCount = await applicationService.getSubmissionCount(applicationId, { status, search })

    // Get evaluation data for enriching submissions
    const evaluationSteps = await prisma.evaluationStep.findMany({
      where: { applicationId },
      select: { id: true, stepNumber: true }
    })

    // Get cutoff scores and evaluation settings
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        cutoffScores: true,
        evaluationSettings: true
      }
    })

    const cutoffScores = app?.cutoffScores
      ? (typeof app.cutoffScores === 'string' ? JSON.parse(app.cutoffScores) : app.cutoffScores)
      : { step1: 0, step2: 0 }

    const evalSettings = app?.evaluationSettings
      ? (typeof app.evaluationSettings === 'string' ? JSON.parse(app.evaluationSettings) : app.evaluationSettings)
      : { minScore: 1, maxScore: 10, requiredEvaluatorPercentage: 75 }

    // Count total evaluators (users with evaluation.score permission)
    // For simplicity, we'll get this from the number of unique judges who have scored any submission
    const uniqueJudges = await prisma.applicationScore.findMany({
      where: {
        submission: { applicationId }
      },
      select: { judgeId: true },
      distinct: ['judgeId']
    })
    const totalJudges = uniqueJudges.length || 1 // Default to 1 to avoid division by zero

    // Enrich submissions with evaluation data
    const enrichedSubmissions = await Promise.all(
      submissions.map(async (submission) => {
        const currentStep = submission.currentStep || 1
        const step = evaluationSteps.find(s => s.stepNumber === currentStep)

        if (!step) {
          return { ...submission, evaluationProgress: null }
        }

        // Get aggregate score for this submission at current step
        const cutoff = currentStep === 1 ? cutoffScores.step1 : cutoffScores.step2
        const aggregateData = await EvaluationService.getAggregateScore(
          submission.id,
          step.id,
          totalJudges,
          cutoff,
          evalSettings.requiredEvaluatorPercentage
        )

        return {
          ...submission,
          evaluationProgress: {
            averageScore: aggregateData.averageScore,
            scored: aggregateData.evaluatorCount,
            total: aggregateData.totalJudges,
            evaluatorPercentage: aggregateData.evaluatorPercentage,
            passed: aggregateData.passed,
            meetsCutoff: aggregateData.meetsCutoff,
            meetsEvaluatorRequirement: aggregateData.meetsEvaluatorRequirement,
            status: aggregateData.status,
            cutoffScore: aggregateData.cutoffScore
          }
        }
      })
    )

    timer.log('GET', `/api/applications/${applicationId}/submissions`, 200)

    return apiResponse({
      submissions: enrichedSubmissions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}/submissions`, error)
    timer.log('GET', `/api/applications/${applicationId}/submissions`, 500)
    return handleApiError(error)
  }
}
