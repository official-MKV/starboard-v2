'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import Link from 'next/link'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our monitoring system
    this.setState({
      error,
      errorInfo,
    })

    // Log to admin system if available
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/admin/error-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            errorInfo: {
              componentStack: errorInfo.componentStack,
            },
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error)
      } catch (e) {
        console.error('Failed to report error:', e)
      }
    }

    // Log to console for development
    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-snow-100 flex items-center justify-center p-4">
          <Card className="starboard-card max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-charcoal-900">Something went wrong</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-slate-gray-600 mb-4">
                  We encountered an unexpected error. Our team has been notified and is working on a
                  fix.
                </p>

                {this.props.showErrorDetails && this.state.error && (
                  <details className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <summary className="font-medium text-red-800 cursor-pointer mb-2">
                      Error Details
                    </summary>
                    <div className="text-sm text-red-700 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="text-xs mt-1 overflow-x-auto">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 starboard-button"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="flex-1"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Button>
                </Link>
              </div>

              <div className="text-center pt-4 border-t border-neutral-200">
                <p className="text-sm text-slate-gray-500">
                  If this problem persists, please{' '}
                  <Link href="/contact" className="text-primary hover:underline">
                    contact support
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping pages
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  return function ErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for error reporting in functional components
export function useErrorReporter() {
  const reportError = (error, context = {}) => {
    console.error('Reported error:', error, context)

    // Log to admin system
    try {
      fetch('/api/admin/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          context,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(console.error)
    } catch (e) {
      console.error('Failed to report error:', e)
    }
  }

  return { reportError }
}

export default ErrorBoundary
