// middleware.js - Updated without Prisma calls
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export default auth(async request => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth?.user

  console.log('Middleware check:', {
    pathname,
    isLoggedIn,
    user: request.auth?.user?.email || 'none',
  })

  // Define protected routes that require workspace context
  const workspaceProtectedRoutes = [
    '/dashboard',
    '/applications',
    '/events',
    '/resources',
    '/messages',
    '/profile',
    '/admin',
    '/settings',
    '/analytics',
    '/integrations',
    '/team',
  ]

  // Define workspace management routes (require login but not workspace)
  const workspaceManagementRoutes = ['/workspaces/select', '/workspaces/create', '/workspaces/join']

  // Define auth routes (should redirect if already logged in)
  const authRoutes = ['/auth/login', '/auth/register']

  // Define public routes that don't need authentication
  const publicRoutes = [
    '/',
    '/about',
    '/contact',
    '/apply', // Public application pages
    '/events/public', // Public event listings
    '/resources/public', // Public resource access
    '/auth/error',
    '/auth/verify-email',
    '/auth/reset-password',
    '/auth/forgot-password',
    '/auth/invite', // Invitation acceptance
  ]

  // Check route types
  const isWorkspaceProtectedRoute = workspaceProtectedRoutes.some(route =>
    pathname.startsWith(route)
  )
  const isWorkspaceManagementRoute = workspaceManagementRoutes.some(route =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

  // Handle API routes separately
  if (pathname.startsWith('/api/')) {
    return handleApiRoutes(request, pathname, isLoggedIn)
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    console.log('Redirecting logged-in user from auth page to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect non-logged-in users from protected pages
  if (!isLoggedIn && (isWorkspaceProtectedRoute || isWorkspaceManagementRoute)) {
    console.log('Redirecting non-logged-in user to login')
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Handle workspace management routes (require login but not workspace)
  if (isLoggedIn && isWorkspaceManagementRoute) {
    console.log('Allowing access to workspace management route')
    return NextResponse.next()
  }

  // Handle workspace-protected routes
  if (isLoggedIn && isWorkspaceProtectedRoute) {
    return handleWorkspaceProtectedRoute(request, pathname)
  }

  // Allow access to public routes
  return NextResponse.next()
})

/**
 * Handle API route authentication and workspace validation
 */
function handleApiRoutes(request, pathname, isLoggedIn) {
  const workspaceCreationApiRoutes = [
    '/api/upload/presigned-url', // For workspace logos during creation
    '/api/upload', // If using this route
  ]

  // Public API routes that don't require authentication
  const publicApiRoutes = [
    '/api/auth',
    '/api/health',
    '/api/public',
    '/api/applications/submit',
    '/api/invitations/accept',
    '/api/invitations/details',
    '/api/onboarding/complete',
    '/api/upload/public/presigned-url',
    '/api/workspaces/check-slug', // Allow slug checking without auth
  ]

  // Workspace management API routes (require auth but not workspace)
  const workspaceManagementApiRoutes = [
    '/api/workspaces', // List and create workspaces
    '/api/workspaces/switch', // Switch workspace
    '/api/workspaces/validate', // Validate workspace access
    '/api/workspaces/current', // Get current workspace
    ...workspaceCreationApiRoutes,
  ]

  const isPublicApi =
    publicApiRoutes.some(route => pathname.startsWith(route)) ||
    /^\/api\/applications\/[^/]+\/submit$/.test(pathname)

  const isWorkspaceManagementApi = workspaceManagementApiRoutes.some(route =>
    pathname.startsWith(route)
  )

  // For public API routes, allow access
  if (isPublicApi) {
    return NextResponse.next()
  }

  // For workspace management APIs, only check authentication
  if (isWorkspaceManagementApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // For all other API routes, check both auth and workspace
  if (!isLoggedIn) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Check workspace cookie for workspace-protected API routes
  const workspaceId = request.cookies.get('starboard-workspace')?.value
  if (!workspaceId) {
    return NextResponse.json(
      {
        error: 'Workspace context required',
        redirect: '/workspaces/select',
      },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

/**
 * Handle workspace-protected routes - simplified without database calls
 */
function handleWorkspaceProtectedRoute(request, pathname) {
  const workspaceId = request.cookies.get('starboard-workspace')?.value

  console.log('Checking workspace cookie:', {
    workspaceId,
    pathname,
    hasCookie: !!workspaceId,
  })

  // No workspace cookie - redirect to workspace selection
  if (!workspaceId) {
    console.log('No workspace cookie found, redirecting to workspace select')
    return NextResponse.redirect(new URL('/workspaces/select', request.url))
  }

  // Let the individual pages/components validate workspace access using the API
  console.log(
    'Workspace cookie found, allowing request (validation will happen at component level)'
  )
  return NextResponse.next()
}

export const config = {
  matcher: [

    '/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
