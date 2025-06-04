// lib/services/enhanced-onboarding.js
import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { uploadFileToS3, deleteFileFromS3 } from '../storage.js'

// ===== ENHANCED ONBOARDING SERVICE =====

export const enhancedOnboardingService = {
  // Create onboarding flow with custom form fields
  async create(workspaceId, onboardingData, creatorId) {
    try {
      return await prisma.onboardingFlow.create({
        data: {
          workspaceId,
          name: onboardingData.name,
          description: onboardingData.description,
          isActive: onboardingData.isActive || true,
          steps: onboardingData.steps || [],
          settings: onboardingData.settings || {},
          requiredProfileFields: onboardingData.requiredProfileFields || [],
          customFields: onboardingData.customFields || [],
          termsAndConditions: onboardingData.termsAndConditions,
          privacyPolicy: onboardingData.privacyPolicy,
          requireTermsAccept: onboardingData.requireTermsAccept || false,
          completionRequired: onboardingData.completionRequired || true,
          completionMessage: onboardingData.completionMessage,
          redirectUrl: onboardingData.redirectUrl,
          createdBy: creatorId,
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              roles: true,
              completions: true,
            },
          },
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  // Get onboarding flow with step validation
  async findById(onboardingId) {
    try {
      const onboarding = await prisma.onboardingFlow.findUnique({
        where: { id: onboardingId },
        include: {
          workspace: true,
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          roles: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          completions: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true,
                },
              },
            },
            orderBy: { startedAt: 'desc' },
            take: 10,
          },
        },
      })

      if (onboarding) {
        // Validate and sanitize steps
        onboarding.steps = this.validateSteps(onboarding.steps)
      }

      return onboarding
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  // Start onboarding with initial data collection
  async startOnboarding(userId, onboardingId, workspaceId) {
    try {
      const onboarding = await prisma.onboardingFlow.findUnique({
        where: { id: onboardingId },
      })

      if (!onboarding) {
        throw new Error('Onboarding flow not found')
      }

      if (!onboarding.isActive) {
        throw new Error('Onboarding flow is not active')
      }

      const steps = onboarding.steps || []

      // Check if already exists
      const existing = await prisma.onboardingCompletion.findUnique({
        where: {
          userId_onboardingId: {
            userId,
            onboardingId,
          },
        },
        include: {
          files: true,
        },
      })

      if (existing) {
        return existing
      }

      return await prisma.onboardingCompletion.create({
        data: {
          userId,
          onboardingId,
          workspaceId,
          totalSteps: steps.length,
          stepProgress: [],
          collectedData: {},
          legalAcceptances: {},
          uploadedFiles: [],
        },
        include: {
          onboarding: {
            select: {
              name: true,
              steps: true,
              settings: true,
              requiredProfileFields: true,
              customFields: true,
              termsAndConditions: true,
              privacyPolicy: true,
              requireTermsAccept: true,
            },
          },
          files: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  // Update onboarding progress with form data and file uploads
  async updateProgress(userId, onboardingId, stepIndex, stepData = {}) {
    try {
      const completion = await prisma.onboardingCompletion.findUnique({
        where: {
          userId_onboardingId: {
            userId,
            onboardingId,
          },
        },
        include: {
          onboarding: true,
          files: true,
        },
      })

      if (!completion) {
        throw new Error('Onboarding progress not found')
      }

      const stepProgress = completion.stepProgress || []
      const steps = completion.onboarding.steps || []
      const currentStep = steps[stepIndex]

      if (!currentStep) {
        throw new Error('Invalid step index')
      }

      // Process step data based on step type
      const processedStepData = await this.processStepData(
        currentStep,
        stepData,
        completion.id,
        userId
      )

      // Update step progress
      stepProgress[stepIndex] = {
        stepId: currentStep.id,
        stepType: currentStep.type,
        completed: true,
        completedAt: new Date(),
        data: processedStepData,
      }

      // Merge collected data
      const collectedData = { ...completion.collectedData }
      if (processedStepData.profileData) {
        Object.assign(collectedData, processedStepData.profileData)
      }
      if (processedStepData.customData) {
        collectedData.customFields = {
          ...collectedData.customFields,
          ...processedStepData.customData,
        }
      }

      // Handle legal acceptances
      const legalAcceptances = { ...completion.legalAcceptances }
      if (processedStepData.legalAcceptances) {
        Object.assign(legalAcceptances, processedStepData.legalAcceptances)
      }

      const currentStepNum = Math.max(stepIndex + 1, completion.currentStep)
      const isCompleted = currentStepNum >= steps.length

      const updatedCompletion = await prisma.onboardingCompletion.update({
        where: { id: completion.id },
        data: {
          currentStep: currentStepNum,
          stepProgress,
          collectedData,
          legalAcceptances,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          lastActiveAt: new Date(),
          ...(processedStepData.termsAcceptedAt && {
            termsAcceptedAt: processedStepData.termsAcceptedAt,
          }),
          ...(processedStepData.privacyAcceptedAt && {
            privacyAcceptedAt: processedStepData.privacyAcceptedAt,
          }),
        },
        include: {
          onboarding: {
            select: {
              name: true,
              completionMessage: true,
              redirectUrl: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          files: true,
        },
      })

      // If completed, update user profile and workspace member
      if (isCompleted) {
        await this.completeOnboarding(userId, completion.workspaceId, collectedData)
      }

      return updatedCompletion
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  // Process different types of step data
  async processStepData(step, stepData, completionId, userId) {
    const processed = {
      rawData: stepData,
    }

    switch (step.type) {
      case 'profile_form':
        processed.profileData = await this.processProfileForm(step, stepData, completionId)
        break

      case 'custom_form':
        processed.customData = await this.processCustomForm(step, stepData, completionId)
        break

      case 'legal_acceptance':
        processed.legalAcceptances = await this.processLegalAcceptance(step, stepData)
        if (stepData.termsAccepted) {
          processed.termsAcceptedAt = new Date()
        }
        if (stepData.privacyAccepted) {
          processed.privacyAcceptedAt = new Date()
        }
        break

      case 'file_upload':
        processed.uploadedFiles = await this.processFileUploads(step, stepData, completionId)
        break

      case 'welcome':
      case 'completion':
        // No special processing needed
        break

      default:
        logger.warn('Unknown onboarding step type', { stepType: step.type, stepId: step.id })
    }

    return processed
  },

  // Process profile form fields
  async processProfileForm(step, stepData, completionId) {
    const profileData = {}
    const fields = step.fields || []

    for (const field of fields) {
      const value = stepData[field.name]

      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'IMAGE_UPLOAD':
            if (typeof value === 'object' && value.file) {
              // Handle file upload
              const uploadedFile = await this.handleFileUpload(
                value.file,
                field.name,
                completionId,
                field
              )
              profileData[field.name] = uploadedFile.fileUrl
            }
            break

          case 'FILE_UPLOAD':
            if (Array.isArray(value)) {
              const uploadedFiles = await Promise.all(
                value.map(file => this.handleFileUpload(file, field.name, completionId, field))
              )
              profileData[field.name] = uploadedFiles.map(f => f.fileUrl)
            } else if (typeof value === 'object' && value.file) {
              const uploadedFile = await this.handleFileUpload(
                value.file,
                field.name,
                completionId,
                field
              )
              profileData[field.name] = uploadedFile.fileUrl
            }
            break

          default:
            profileData[field.name] = value
        }
      }
    }

    return profileData
  },

  // Process custom form fields
  async processCustomForm(step, stepData, completionId) {
    const customData = {}
    const fields = step.fields || []

    for (const field of fields) {
      const value = stepData[field.name]

      if (value !== undefined && value !== null && value !== '') {
        if (field.type === 'FILE_UPLOAD' || field.type === 'IMAGE_UPLOAD') {
          // Handle file uploads
          if (Array.isArray(value)) {
            const uploadedFiles = await Promise.all(
              value.map(file => this.handleFileUpload(file, field.name, completionId, field))
            )
            customData[field.name] = uploadedFiles.map(f => ({
              url: f.fileUrl,
              name: f.originalName,
              size: f.fileSize,
            }))
          } else if (typeof value === 'object' && value.file) {
            const uploadedFile = await this.handleFileUpload(
              value.file,
              field.name,
              completionId,
              field
            )
            customData[field.name] = {
              url: uploadedFile.fileUrl,
              name: uploadedFile.originalName,
              size: uploadedFile.fileSize,
            }
          }
        } else {
          customData[field.name] = value
        }
      }
    }

    return customData
  },

  // Process legal acceptance
  async processLegalAcceptance(step, stepData) {
    const acceptances = {}
    const documents = step.content?.documents || []

    for (const doc of documents) {
      const accepted = stepData[`${doc.type}_accepted`]
      if (accepted) {
        acceptances[doc.type] = {
          accepted: true,
          acceptedAt: new Date(),
          version: doc.version || '1.0',
          url: doc.url,
        }
      }
    }

    return acceptances
  },

  // Handle file uploads to S3
  async handleFileUpload(fileData, fieldName, completionId, fieldConfig) {
    try {
      // Validate file
      const validation = this.validateFile(fileData, fieldConfig)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Upload to S3
      const uploadResult = await uploadFileToS3(
        fileData.buffer,
        fileData.originalname,
        fileData.mimetype,
        'onboarding' // S3 folder
      )

      // Save file record
      const fileRecord = await prisma.onboardingFile.create({
        data: {
          completionId,
          fieldName,
          originalName: fileData.originalname,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: fileData.size,
          mimeType: fileData.mimetype,
        },
      })

      return fileRecord
    } catch (error) {
      logger.error('File upload failed during onboarding', {
        fieldName,
        completionId,
        error: error.message,
      })
      throw error
    }
  },

  // Validate uploaded files
  validateFile(fileData, fieldConfig) {
    const maxSize = fieldConfig.maxSize || 10 * 1024 * 1024 // 10MB default
    const acceptedTypes = fieldConfig.acceptedTypes || []

    if (fileData.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      }
    }

    if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileData.mimetype)) {
      return {
        valid: false,
        error: `File type ${fileData.mimetype} is not allowed`,
      }
    }

    return { valid: true }
  },

  // Complete onboarding and update user profile
  async completeOnboarding(userId, workspaceId, collectedData) {
    try {
      await prisma.$transaction(async tx => {
        // Update user profile with collected data
        const userUpdates = {}

        // Standard profile fields
        const profileFields = [
          'avatar',
          'phone',
          'bio',
          'location',
          'address',
          'company',
          'jobTitle',
          'website',
          'linkedIn',
          'twitter',
        ]

        profileFields.forEach(field => {
          if (collectedData[field] !== undefined) {
            userUpdates[field] = collectedData[field]
          }
        })

        // Custom fields go into profileData JSON
        if (collectedData.customFields) {
          userUpdates.profileData = collectedData.customFields
        }

        // Mark onboarding as completed
        userUpdates.isOnboardingCompleted = true
        userUpdates.onboardingCompletedAt = new Date()

        await tx.user.update({
          where: { id: userId },
          data: userUpdates,
        })

        // Update workspace member onboarding status
        await tx.workspaceMember.updateMany({
          where: {
            userId,
            workspaceId,
          },
          data: {
            onboardingCompletedAt: new Date(),
          },
        })
      })

      logger.info('Onboarding completed and user profile updated', {
        userId,
        workspaceId,
        fieldsUpdated: Object.keys(collectedData),
      })
    } catch (error) {
      logger.error('Failed to complete onboarding', {
        userId,
        workspaceId,
        error: error.message,
      })
      throw error
    }
  },

  // Validate onboarding steps structure
  validateSteps(steps) {
    if (!Array.isArray(steps)) {
      return []
    }

    return steps
      .map((step, index) => ({
        id: step.id || `step_${index}`,
        type: step.type || 'welcome',
        title: step.title || 'Step',
        description: step.description || '',
        order: step.order || index,
        required: step.required !== false,
        fields: step.fields || [],
        content: step.content || {},
      }))
      .sort((a, b) => a.order - b.order)
  },

  // Get available field types for onboarding forms
  getProfileFieldTypes() {
    return [
      {
        type: 'TEXT',
        label: 'Short Text',
        description: 'Single line text input',
        icon: 'Type',
      },
      {
        type: 'TEXTAREA',
        label: 'Long Text',
        description: 'Multi-line text area',
        icon: 'FileText',
      },
      {
        type: 'EMAIL',
        label: 'Email',
        description: 'Email address with validation',
        icon: 'Mail',
      },
      {
        type: 'PHONE',
        label: 'Phone',
        description: 'Phone number input',
        icon: 'Phone',
      },
      {
        type: 'URL',
        label: 'Website URL',
        description: 'URL with validation',
        icon: 'Globe',
      },
      {
        type: 'DATE',
        label: 'Date',
        description: 'Date picker',
        icon: 'Calendar',
      },
      {
        type: 'SELECT',
        label: 'Dropdown',
        description: 'Single selection dropdown',
        icon: 'List',
      },
      {
        type: 'RADIO',
        label: 'Radio Buttons',
        description: 'Single choice from options',
        icon: 'CheckCircle',
      },
      {
        type: 'CHECKBOX',
        label: 'Checkboxes',
        description: 'Multiple selections',
        icon: 'CheckSquare',
      },
      {
        type: 'BOOLEAN',
        label: 'Yes/No',
        description: 'Single checkbox',
        icon: 'ToggleLeft',
      },
      {
        type: 'IMAGE_UPLOAD',
        label: 'Image Upload',
        description: 'Single image upload (for profile photos)',
        icon: 'Image',
      },
      {
        type: 'FILE_UPLOAD',
        label: 'File Upload',
        description: 'Document upload',
        icon: 'Upload',
      },
      {
        type: 'ADDRESS',
        label: 'Address',
        description: 'Full address input',
        icon: 'MapPin',
      },
      {
        type: 'LOCATION',
        label: 'Location',
        description: 'City, Country input',
        icon: 'Map',
      },
      {
        type: 'RICH_TEXT',
        label: 'Rich Text',
        description: 'Rich text editor',
        icon: 'Edit',
      },
      {
        type: 'NUMBER',
        label: 'Number',
        description: 'Numeric input',
        icon: 'Hash',
      },
      {
        type: 'RATING',
        label: 'Rating',
        description: 'Star rating or numeric rating',
        icon: 'Star',
      },
      {
        type: 'LEGAL_ACCEPTANCE',
        label: 'Legal Acceptance',
        description: 'Terms and conditions checkbox',
        icon: 'FileCheck',
      },
    ]
  },

  // Get available step types for onboarding flows
  getOnboardingStepTypes() {
    return [
      {
        type: 'welcome',
        label: 'Welcome Message',
        description: 'Show a welcome message with optional image/video',
        icon: 'Heart',
        configurable: ['title', 'content', 'image', 'video'],
      },
      {
        type: 'profile_form',
        label: 'Profile Form',
        description: 'Collect user profile information',
        icon: 'User',
        configurable: ['fields', 'layout'],
      },
      {
        type: 'custom_form',
        label: 'Custom Form',
        description: 'Collect additional custom information',
        icon: 'FileText',
        configurable: ['fields', 'layout'],
      },
      {
        type: 'legal_acceptance',
        label: 'Legal Documents',
        description: 'Terms, privacy policy, and legal acceptances',
        icon: 'FileCheck',
        configurable: ['documents', 'required'],
      },
      {
        type: 'file_upload',
        label: 'File Upload',
        description: 'Upload documents or images',
        icon: 'Upload',
        configurable: ['fileTypes', 'maxSize', 'multiple'],
      },
      {
        type: 'meeting_scheduler',
        label: 'Schedule Meeting',
        description: 'Schedule an onboarding meeting',
        icon: 'Calendar',
        configurable: ['meetingTypes', 'availableTimes'],
      },
      {
        type: 'resource_library',
        label: 'Resource Library',
        description: 'Share important resources and documents',
        icon: 'BookOpen',
        configurable: ['resources', 'required'],
      },
      {
        type: 'completion',
        label: 'Completion Message',
        description: 'Final message and next steps',
        icon: 'CheckCircle',
        configurable: ['message', 'redirect', 'nextSteps'],
      },
    ]
  },

  // Delete onboarding files when removing completion
  async deleteOnboardingFiles(completionId) {
    try {
      const files = await prisma.onboardingFile.findMany({
        where: { completionId },
      })

      // Delete from S3
      await Promise.all(files.map(file => deleteFileFromS3(file.fileName)))

      // Delete from database
      await prisma.onboardingFile.deleteMany({
        where: { completionId },
      })

      logger.info('Onboarding files deleted', { completionId, count: files.length })
    } catch (error) {
      logger.error('Failed to delete onboarding files', {
        completionId,
        error: error.message,
      })
    }
  },
}
