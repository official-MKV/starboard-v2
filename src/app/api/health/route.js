import { NextResponse } from 'next/server'
import { getDatabaseHealth, testConnection } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('Health check requested')

    // Check database connection
    const dbHealth = await getDatabaseHealth()

    // Check basic app functionality
    const appHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }

    // Overall health status
    const isHealthy = dbHealth.status === 'healthy'

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        app: appHealth,
        database: dbHealth,
      },
    }

    logger.info('Health check completed', { status: response.status })

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
    })
  } catch (error) {
    logger.error('Health check failed', { error: error.message })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    )
  }
}

// Detailed health check for internal monitoring
export async function POST() {
  try {
    logger.info('Detailed health check requested')

    const checks = []

    // Database connection test
    try {
      const connectionTest = await testConnection()
      checks.push({
        name: 'database_connection',
        status: connectionTest ? 'pass' : 'fail',
        details: connectionTest ? 'Connected successfully' : 'Connection failed',
      })
    } catch (error) {
      checks.push({
        name: 'database_connection',
        status: 'fail',
        details: error.message,
      })
    }

    // Database query performance test
    try {
      const start = Date.now()
      const dbHealth = await getDatabaseHealth()
      const queryTime = Date.now() - start

      checks.push({
        name: 'database_performance',
        status: queryTime < 1000 ? 'pass' : 'warn',
        details: `Query time: ${queryTime}ms`,
        responseTime: queryTime,
      })
    } catch (error) {
      checks.push({
        name: 'database_performance',
        status: 'fail',
        details: error.message,
      })
    }

    // Memory usage check
    const memoryUsage = process.memoryUsage()
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    checks.push({
      name: 'memory_usage',
      status: memoryMB < 512 ? 'pass' : 'warn',
      details: `Heap used: ${memoryMB}MB`,
      memoryUsage: {
        heapUsedMB: memoryMB,
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        externalMB: Math.round(memoryUsage.external / 1024 / 1024),
      },
    })

    // Environment variables check
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    checks.push({
      name: 'environment_variables',
      status: missingEnvVars.length === 0 ? 'pass' : 'fail',
      details:
        missingEnvVars.length === 0
          ? 'All required environment variables are set'
          : `Missing: ${missingEnvVars.join(', ')}`,
    })

    const allPassed = checks.every(check => check.status === 'pass')
    const hasWarnings = checks.some(check => check.status === 'warn')

    const overallStatus = allPassed ? 'healthy' : hasWarnings ? 'degraded' : 'unhealthy'

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: checks.filter(c => c.status === 'warn').length,
        failed: checks.filter(c => c.status === 'fail').length,
      },
    }

    logger.info('Detailed health check completed', {
      status: overallStatus,
      summary: response.summary,
    })

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
    })
  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure',
        details: error.message,
      },
      { status: 503 }
    )
  }
}
