import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { generateId } from '@/lib/utils'
import { EmailService } from '@/lib/services/email-service' // Add this import
import { EmailTemplateService } from '@/lib/services/email-template-service' // Add this import
import { z } from 'zod'

const submitApplicationSchema = z.object({
  applicantEmail: z.string().email('Invalid email address'),
  applicantFirstName: z.string().min(1, 'First name is required').optional(),
  applicantLastName: z.string().min(1, 'Last name is required').optional(),
  applicantPhone: z.string().optional(),
  companyName: z.string().optional(),
  responses: z.record(z.any()).default({}),
  attachments: z.array(z.string()).optional(),
})

export async function POST(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = await params

  try {
    logger.apiRequest('POST', `/api/applications/${applicationId}/submit`)

    const validation = await validateRequest(request, submitApplicationSchema)
    console.log(validation)

    if (!validation.success) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      const errorMessage = validation.errors?.[0]?.message || 'Validation failed'
      return apiError(errorMessage, 400, 'VALIDATION_ERROR', {
        errors: validation.errors
      })
    }

    const data = validation.data

    const application = await applicationService.findById(applicationId)

    if (!application) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 404)
      return apiError('Application not found', 404)
    }

    if (!application.isActive) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application is not currently accepting submissions', 400)
    }

    // Check if application is within submission period
    const now = new Date()
    if (application.openDate && application.openDate > now) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application submissions have not opened yet', 400)
    }

    if (application.closeDate && application.closeDate < now) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application submissions have closed', 400)
    }

    if (application.maxSubmissions) {
      const currentCount = await applicationService.getSubmissionCount(applicationId)
      if (currentCount >= application.maxSubmissions) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
        return apiError('Maximum number of submissions reached', 400)
      }
    }

    if (!application.allowMultipleSubmissions) {
      const existingSubmission = await applicationService.findSubmissionByEmail(
        applicationId,
        data.applicantEmail
      )

      if (existingSubmission) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
        return apiError('You have already submitted an application', 400)
      }
    }

    // Validate form responses against application fields
    const validationResult = await applicationService.validateSubmission(
      applicationId,
      data.responses
    )

    if (!validationResult.isValid) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Form validation failed', 400, 'FORM_VALIDATION_ERROR', {
        fieldErrors: validationResult.errors,
      })
    }

    // Check if user needs authentication
    let userId = null
    const session = await auth()

    if (application.requireAuthentication) {
      if (!session?.user?.id) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 401)
        return apiError('Authentication required for this application', 401)
      }
      userId = session.user.id
    } else if (session?.user?.id) {
      // Link to user account if they're logged in (optional)
      if (session.user.email === data.applicantEmail) {
        userId = session.user.id
      }
    }

    // Create the submission
    const submissionData = {
      applicationId,
      applicantEmail: data.applicantEmail.toLowerCase().trim(),

      userId,
      responses: data.responses,
      attachments: data.attachments || [],
      status: 'SUBMITTED',
      submittedAt: new Date(),
      progress: 100,
    }

    const submission = await applicationService.createSubmission(submissionData)

    // Update submission count
    await applicationService.incrementSubmissionCount(applicationId)

    // ✅ Send confirmation email to applicant
    try {
      await sendConfirmationEmail({
        application,
        submission,
        applicantData: {
          email: data.applicantEmail,
          firstName: data.applicantFirstName,
          lastName: data.applicantLastName,
        },
      })

      logger.info('Confirmation email sent successfully', {
        applicationId,
        submissionId: submission.id,
        applicantEmail: data.applicantEmail,
      })
    } catch (emailError) {
      // Log email error but don't fail the submission
      logger.error('Failed to send confirmation email', {
        applicationId,
        submissionId: submission.id,
        applicantEmail: data.applicantEmail,
        error: emailError.message,
      })
    }

    timer.log('POST', `/api/applications/${applicationId}/submit`, 201)

    return apiResponse(
      {
        submission: {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          confirmationNumber: submission.id.slice(-8).toUpperCase(),
        },
        message: 'Application submitted successfully',
      },
      201
    )
  } catch (error) {
    logger.apiError('POST', `/api/applications/${applicationId}/submit`, error)
    timer.log('POST', `/api/applications/${applicationId}/submit`, 500)
    return handleApiError(error)
  }
}

// ✅ NEW: Function to send confirmation email
async function sendConfirmationEmail({ application, submission, applicantData }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const confirmationNumber = submission.id.slice(-8).toUpperCase()

    // Create branded HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #3e3eff;">
              <img src="${baseUrl}/logo-1.svg" alt="Starboard Logo" style="height: 50px; width: auto;">
            </td>
          </tr>

          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${baseUrl}/noise4.jpg" alt="Application Received" style="width: 100%; height: 200px; object-fit: cover; display: block;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 700; line-height: 1.3;">
                Application Received!
              </h1>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Dear ${applicantData.firstName || 'Applicant'},
              </p>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for submitting your application for <strong>${application.title}</strong>. We have received your application and are excited to review it.
              </p>

              <!-- Submission Date -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0ff; border: 1px solid #3e3eff; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;">
                      Submitted on
                    </p>
                    <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                      ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Our team will carefully review your application and get back to you soon. 
              </p>

              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                If you have any questions, please don't hesitate to contact our support team.
              </p>

              <!-- Signature -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                  Best regards,
                </p>
                <p style="margin: 0 0 4px 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                  Mrs. Maureen Nzekwe
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px;">
                  Program Director, Starboard
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; line-height: 1.5;">
                © ${new Date().getFullYear()} Starboard. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Send the email
    await EmailService.sendEmail({
      to: applicantData.email,
      from: '"Mrs. Maureen Nzekwe - Starboard" <support@mystarboard.ng>',
      subject: `Application Received - ${application.title}`,
      html: htmlContent,
    })

    logger.info('Confirmation email sent successfully', {
      applicationId: application.id,
      submissionId: submission.id,
      applicantEmail: applicantData.email,
    })
  } catch (error) {
    logger.error('Error in sendConfirmationEmail', {
      error: error.message,
      applicantEmail: applicantData.email,
      applicationId: application.id,
    })
    throw error
  }
}

// Get submission status for a specific applicant (unchanged)
export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      timer.log('GET', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Email parameter is required', 400)
    }

    logger.apiRequest('GET', `/api/applications/${applicationId}/submit`)

    const submission = await applicationService.findSubmissionByEmail(
      applicationId,
      email.toLowerCase().trim()
    )

    if (!submission) {
      timer.log('GET', `/api/applications/${applicationId}/submit`, 404)
      return apiResponse({ hasSubmission: false })
    }

    timer.log('GET', `/api/applications/${applicationId}/submit`, 200)

    return apiResponse({
      hasSubmission: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        confirmationNumber: submission.id.slice(-8).toUpperCase(),
      },
    })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}/submit`, error)
    timer.log('GET', `/api/applications/${applicationId}/submit`, 500)
    return handleApiError(error)
  }
}
