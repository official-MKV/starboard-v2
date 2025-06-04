// Enhanced logging utility for Starboard with database activity tracking

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

const CURRENT_LOG_LEVEL = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
}

// Activity types that should be saved to database
const TRACKABLE_ACTIVITIES = [
  'auth',
  'workspace',
  'application',
  'user',
  'role',
  'message',
  'resource',
  'calendar_event',
  'api_error',
]

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString()
  const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''

  return {
    timestamp,
    level,
    message,
    meta,
    formatted: `[${timestamp}] ${level}: ${message} ${metaString}`.trim(),
  }
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= CURRENT_LOG_LEVEL
}

// Database activity saving function
async function saveActivity(level, message, meta = {}) {
  // Only save certain types of activities to avoid database bloat
  if (!meta.type || !TRACKABLE_ACTIVITIES.includes(meta.type)) {
    return
  }

  // Skip debug logs in production for database storage
  if (isProduction && level === 'DEBUG') {
    return
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Determine activity type and extract relevant data
    const activityData = mapLogToActivity(level, message, meta)

    if (activityData) {
      await prisma.activity.create({
        data: activityData,
      })
    }

    await prisma.$disconnect()
  } catch (error) {
    // Don't let database errors break the application
    console.error('Failed to save activity to database:', error.message)
  }
}

// Map log data to activity database structure
function mapLogToActivity(level, message, meta) {
  const baseActivity = {
    timestamp: new Date(),
    level: level,
    message: message,
    metadata: meta,
    userId: meta.userId || null,
    workspaceId: meta.workspaceId || null,
  }

  // Map different activity types
  switch (meta.type) {
    case 'auth':
      return {
        ...baseActivity,
        type: `auth_${meta.event || 'action'}`,
        title: `Authentication: ${meta.event || 'Action'}`,
        description: message,
        icon: 'Shield',
        color: 'green',
      }

    case 'workspace':
      return {
        ...baseActivity,
        type: `workspace_${meta.event || 'action'}`,
        title: `Workspace: ${meta.event || 'Action'}`,
        description: message,
        icon: 'Building2',
        color: 'blue',
      }

    case 'application':
      return {
        ...baseActivity,
        type: `application_${meta.event || 'action'}`,
        title: `Application: ${meta.event || 'Action'}`,
        description: message,
        applicationId: meta.applicationId || null,
        icon: 'FileText',
        color: determineApplicationColor(meta.event),
      }

    case 'user':
      return {
        ...baseActivity,
        type: `user_${meta.event || 'action'}`,
        title: `User: ${meta.event || 'Action'}`,
        description: message,
        icon: 'User',
        color: 'orange',
      }

    case 'role':
      return {
        ...baseActivity,
        type: `role_${meta.event || 'action'}`,
        title: `Role: ${meta.event || 'Action'}`,
        description: message,
        roleId: meta.roleId || null,
        icon: 'Shield',
        color: 'purple',
      }

    case 'calendar_event':
      return {
        ...baseActivity,
        type: `calendar_event_${meta.event || 'action'}`,
        title: `Event: ${meta.event || 'Action'}`,
        description: message,
        eventId: meta.eventId || null,
        icon: 'Calendar',
        color: 'indigo',
      }

    case 'message':
      return {
        ...baseActivity,
        type: `message_${meta.event || 'action'}`,
        title: `Message: ${meta.event || 'Action'}`,
        description: message,
        messageId: meta.messageId || null,
        icon: 'MessageCircle',
        color: 'purple',
      }

    case 'resource':
      return {
        ...baseActivity,
        type: `resource_${meta.event || 'action'}`,
        title: `Resource: ${meta.event || 'Action'}`,
        description: message,
        resourceId: meta.resourceId || null,
        icon: 'FolderOpen',
        color: 'green',
      }

    case 'api_error':
      return {
        ...baseActivity,
        type: 'api_error',
        title: `API Error`,
        description: message,
        icon: 'AlertCircle',
        color: 'red',
      }

    default:
      return {
        ...baseActivity,
        type: meta.type || 'general',
        title: `System: ${meta.type || 'Action'}`,
        description: message,
        icon: 'Activity',
        color: 'gray',
      }
  }
}

function determineApplicationColor(event) {
  if (event?.includes('approved')) return 'green'
  if (event?.includes('rejected')) return 'red'
  if (event?.includes('submitted')) return 'blue'
  return 'orange'
}

export const logger = {
  error: (message, meta = {}) => {
    if (!shouldLog('ERROR')) return

    const log = formatMessage('ERROR', message, meta)

    if (isDevelopment) {
      console.error(`${colors.red}${log.formatted}${colors.reset}`)
    } else {
      console.error(JSON.stringify(log))
    }

    // Save to database
    saveActivity('ERROR', message, meta)

    // In production, you might want to send to external logging service
    if (isProduction) {
      // sendToExternalLogger(log)
    }
  },

  warn: (message, meta = {}) => {
    if (!shouldLog('WARN')) return

    const log = formatMessage('WARN', message, meta)

    if (isDevelopment) {
      console.warn(`${colors.yellow}${log.formatted}${colors.reset}`)
    } else {
      console.warn(JSON.stringify(log))
    }

    // Save to database
    saveActivity('WARN', message, meta)
  },

  info: (message, meta = {}) => {
    if (!shouldLog('INFO')) return

    const log = formatMessage('INFO', message, meta)

    if (isDevelopment) {
      console.info(`${colors.blue}${log.formatted}${colors.reset}`)
    } else {
      console.info(JSON.stringify(log))
    }

    // Save to database
    saveActivity('INFO', message, meta)
  },

  debug: (message, meta = {}) => {
    if (!shouldLog('DEBUG')) return

    const log = formatMessage('DEBUG', message, meta)

    if (isDevelopment) {
      console.debug(`${colors.gray}${log.formatted}${colors.reset}`)
    }

    // Save to database (only in development for debug logs)
    if (isDevelopment) {
      saveActivity('DEBUG', message, meta)
    }
  },

  // Special methods for common use cases with your existing systems
  authActivity: (event, userId, meta = {}) => {
    logger.info(`Auth: ${event}`, { userId, event, ...meta, type: 'auth' })
  },

  workspaceActivity: (event, workspaceId, userId, meta = {}) => {
    logger.info(`Workspace: ${event}`, { workspaceId, userId, event, ...meta, type: 'workspace' })
  },

  applicationActivity: (event, applicationId, userId, workspaceId, meta = {}) => {
    logger.info(`Application: ${event}`, {
      applicationId,
      userId,
      workspaceId,
      event,
      ...meta,
      type: 'application',
    })
  },

  userActivity: (event, userId, workspaceId, meta = {}) => {
    logger.info(`User: ${event}`, { userId, workspaceId, event, ...meta, type: 'user' })
  },

  roleActivity: (event, roleId, userId, workspaceId, meta = {}) => {
    logger.info(`Role: ${event}`, {
      roleId,
      userId,
      workspaceId,
      event,
      ...meta,
      type: 'role',
    })
  },

  calendarEventActivity: (event, eventId, userId, workspaceId, meta = {}) => {
    logger.info(`Event: ${event}`, {
      eventId,
      userId,
      workspaceId,
      event,
      ...meta,
      type: 'calendar_event',
    })
  },

  messageActivity: (event, messageId, userId, workspaceId, meta = {}) => {
    logger.info(`Message: ${event}`, {
      messageId,
      userId,
      workspaceId,
      event,
      ...meta,
      type: 'message',
    })
  },

  resourceActivity: (event, resourceId, userId, workspaceId, meta = {}) => {
    logger.info(`Resource: ${event}`, {
      resourceId,
      userId,
      workspaceId,
      event,
      ...meta,
      type: 'resource',
    })
  },

  // Legacy methods for backward compatibility
  apiRequest: (method, url, userId = null) => {
    logger.debug(`API ${method} ${url}`, { userId, method, url, type: 'api_request' })
  },

  apiError: (method, url, error, userId = null, workspaceId = null) => {
    logger.error(`API ${method} ${url} - Error: ${error.message}`, {
      userId,
      workspaceId,
      method,
      url,
      error: error.stack,
      type: 'api_error',
    })
  },
}

// Request timing middleware helper
export function createRequestTimer() {
  const start = Date.now()

  return {
    end: () => Date.now() - start,
    log: (method, url, status, userId = null) => {
      const duration = Date.now() - start
      logger.debug(`API ${method} ${url} - ${status} (${duration}ms)`, {
        userId,
        method,
        url,
        status,
        duration,
        type: 'api_response',
      })
    },
  }
}

// Error handling wrapper
export function logAndRethrow(error, context = {}) {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  })
  throw error
}

// Performance monitoring
export function measurePerformance(name, fn) {
  return async (...args) => {
    const start = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - start
      logger.debug(`Performance: ${name} took ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error(`Performance: ${name} failed after ${duration}ms`, { error: error.message })
      throw error
    }
  }
}

export default logger
