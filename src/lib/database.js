import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database connection test
export async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

// Multi-tenant helper to ensure all queries include workspace filter
export function createWorkspaceContext(workspaceId) {
  if (!workspaceId) {
    throw new Error('Workspace ID is required for multi-tenant operations')
  }

  return {
    workspaceId,

    // Helper methods for common workspace-scoped queries
    users: {
      findMany: (args = {}) =>
        prisma.user.findMany({
          ...args,
          where: {
            ...args.where,
            workspaceMembers: {
              some: { workspaceId },
            },
          },
        }),

      findUnique: args =>
        prisma.user.findFirst({
          ...args,
          where: {
            ...args.where,
            workspaceMembers: {
              some: { workspaceId },
            },
          },
        }),
    },

    applications: {
      findMany: (args = {}) =>
        prisma.application.findMany({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      findUnique: args =>
        prisma.application.findUnique({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      create: data =>
        prisma.application.create({
          data: { ...data, workspaceId },
        }),

      update: args =>
        prisma.application.update({
          ...args,
          where: { ...args.where, workspaceId },
        }),
    },

    events: {
      findMany: (args = {}) =>
        prisma.event.findMany({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      create: data =>
        prisma.event.create({
          data: { ...data, workspaceId },
        }),
    },

    resources: {
      findMany: (args = {}) =>
        prisma.resource.findMany({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      create: data =>
        prisma.resource.create({
          data: { ...data, workspaceId },
        }),
    },

    messages: {
      findMany: (args = {}) =>
        prisma.message.findMany({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      create: data =>
        prisma.message.create({
          data: { ...data, workspaceId },
        }),
    },

    notifications: {
      findMany: (args = {}) =>
        prisma.notification.findMany({
          ...args,
          where: { ...args.where, workspaceId },
        }),

      create: data =>
        prisma.notification.create({
          data: { ...data, workspaceId },
        }),
    },
  }
}

// Error handling wrapper
export function handleDatabaseError(error) {
  console.error('Database Error:', error)

  // Prisma-specific error handling
  if (error.code === 'P2002') {
    return {
      type: 'UNIQUE_CONSTRAINT',
      message: 'A record with this data already exists',
      field: error.meta?.target?.[0] || 'unknown',
    }
  }

  if (error.code === 'P2025') {
    return {
      type: 'NOT_FOUND',
      message: 'Record not found',
    }
  }

  if (error.code === 'P2003') {
    return {
      type: 'FOREIGN_KEY_CONSTRAINT',
      message: 'Referenced record does not exist',
    }
  }

  // Generic error
  return {
    type: 'DATABASE_ERROR',
    message: 'An unexpected database error occurred',
    originalError: error.message,
  }
}

// Transaction wrapper with error handling
export async function withTransaction(callback) {
  try {
    return await prisma.$transaction(callback)
  } catch (error) {
    throw handleDatabaseError(error)
  }
}

// Health check for the database
export async function getDatabaseHealth() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}
