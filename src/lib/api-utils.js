import { NextResponse } from 'next/server'
import { z } from 'zod'

// ===== RESPONSE HELPERS =====

export function apiResponse(data, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function apiError(message, status = 400, code = null) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

export function apiValidationError(errors) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 400 }
  )
}

// ===== REQUEST VALIDATION =====

export async function validateRequest(request, schema) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ field: 'body', message: 'Invalid JSON data' }],
    }
  }
}

export function validateQueryParams(searchParams, schema) {
  try {
    const params = Object.fromEntries(searchParams.entries())
    const validated = schema.parse(params)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ field: 'query', message: 'Invalid query parameters' }],
    }
  }
}

// ===== COMMON VALIDATION SCHEMAS =====

export const schemas = {
  // User schemas
  createUser: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  }),

  loginUser: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  // Workspace schemas
  createWorkspace: z.object({
    name: z.string().min(1, 'Workspace name is required'),
    slug: z
      .string()
      .min(1, 'Workspace slug is required')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    description: z.string().optional(),
  }),

  // Application schemas
  createApplication: z.object({
    title: z.string().min(1, 'Application title is required'),
    description: z.string().optional(),
    isPublic: z.boolean().default(true),
    openDate: z.string().datetime().optional(),
    closeDate: z.string().datetime().optional(),
    maxApplicants: z.number().int().positive().optional(),
    formFields: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['text', 'textarea', 'select', 'file', 'checkbox', 'radio']),
        label: z.string(),
        required: z.boolean().default(false),
        placeholder: z.string().optional(),
        options: z.array(z.string()).optional(),
      })
    ),
  }),

  submitApplication: z.object({
    applicantEmail: z.string().email('Invalid email address'),
    applicantFirstName: z.string().min(1, 'First name is required'),
    applicantLastName: z.string().min(1, 'Last name is required'),
    applicantPhone: z.string().optional(),
    companyName: z.string().optional(),
    responses: z.record(z.any()),
  }),

  inviteApplicant: z.object({
    submissionId: z.string().min(1, 'Submission ID is required'),
    message: z.string().optional(),
  }),

  acceptInvitation: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),

  // Event schemas
  createEvent: z.object({
    title: z.string().min(1, 'Event title is required'),
    description: z.string().optional(),
    type: z.enum([
      'WORKSHOP',
      'MENTORING',
      'PITCH',
      'NETWORKING',
      'DEMO_DAY',
      'BOOTCAMP',
      'WEBINAR',
      'OTHER',
    ]),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    location: z.string().optional(),
    virtualLink: z.string().url().optional(),
    isPublic: z.boolean().default(false),
    maxAttendees: z.number().int().positive().optional(),
  }),

  // Resource schemas
  createResource: z.object({
    title: z.string().min(1, 'Resource title is required'),
    description: z.string().optional(),
    type: z.enum([
      'FILE',
      'LINK',
      'VIDEO',
      'DOCUMENT',
      'PRESENTATION',
      'SPREADSHEET',
      'IMAGE',
      'OTHER',
    ]),
    isPublic: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
  }),

  // Message schemas
  createMessage: z.object({
    receiverId: z.string().optional(),
    groupId: z.string().optional(),
    content: z.string().min(1, 'Message content is required'),
    type: z.enum(['TEXT', 'FILE', 'IMAGE', 'SYSTEM']).default('TEXT'),
  }),

  // Pagination schema
  pagination: z.object({
    page: z.string().transform(val => parseInt(val) || 1),
    limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
    search: z.string().optional(),
  }),
}

// ===== MIDDLEWARE HELPERS =====

export function requireAuth(handler) {
  return async (request, context) => {
    // This will be implemented when we add NextAuth
    // For now, return the handler directly
    return handler(request, context)
  }
}

export function requireWorkspace(handler) {
  return async (request, context) => {
    const { workspaceSlug } = context.params || {}

    if (!workspaceSlug) {
      return apiError('Workspace is required', 400)
    }

    // Add workspace to context
    context.workspaceSlug = workspaceSlug
    return handler(request, context)
  }
}

export function requirePermission(permission) {
  return handler => {
    return async (request, context) => {
      // This will be implemented when we add role-based permissions
      // For now, return the handler directly
      return handler(request, context)
    }
  }
}

// ===== ERROR HANDLING =====

export function handleApiError(error) {
  console.error('API Error:', error)

  // Database errors
  if (error.type) {
    switch (error.type) {
      case 'UNIQUE_CONSTRAINT':
        return apiError(`${error.field} already exists`, 409, 'DUPLICATE_ENTRY')
      case 'NOT_FOUND':
        return apiError('Resource not found', 404, 'NOT_FOUND')
      case 'FOREIGN_KEY_CONSTRAINT':
        return apiError('Referenced resource does not exist', 400, 'INVALID_REFERENCE')
      default:
        return apiError('Database operation failed', 500, 'DATABASE_ERROR')
    }
  }

  // Generic server error
  return apiError('Internal server error', 500, 'INTERNAL_ERROR')
}

// ===== RATE LIMITING =====

const requests = new Map()

export function rateLimit(maxRequests = 100, windowMs = 60 * 1000) {
  return handler => {
    return async (request, context) => {
      // Simple in-memory rate limiting (use Redis in production)
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const now = Date.now()
      const windowStart = now - windowMs

      if (!requests.has(ip)) {
        requests.set(ip, [])
      }

      const userRequests = requests.get(ip)
      const validRequests = userRequests.filter(time => time > windowStart)

      if (validRequests.length >= maxRequests) {
        return apiError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED')
      }

      validRequests.push(now)
      requests.set(ip, validRequests)

      return handler(request, context)
    }
  }
}

// ===== UTILITY FUNCTIONS =====

export function parseFilters(searchParams) {
  const filters = {}

  for (const [key, value] of searchParams.entries()) {
    if (value === 'true') filters[key] = true
    else if (value === 'false') filters[key] = false
    else if (!isNaN(value)) filters[key] = Number(value)
    else filters[key] = value
  }

  return filters
}

export function formatPaginationResponse(data, pagination) {
  return {
    data,
    pagination: {
      ...pagination,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
  }
}
