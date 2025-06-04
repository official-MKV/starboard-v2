import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { userService } from './services/database.js'
import WorkspaceContext from './workspace-context.js'
import { logger } from './logger.js'

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Login attempt with missing credentials')
            return null
          }

          // Find user by email
          const user = await userService.findByEmail(credentials.email)

          if (!user) {
            logger.warn('Login attempt with invalid email', { email: credentials.email })
            return null
          }

          if (!user.isActive) {
            logger.warn('Login attempt for inactive user', { userId: user.id })
            return null
          }

          // Verify password
          const isPasswordValid = await userService.verifyPassword(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            logger.warn('Login attempt with invalid password', { userId: user.id })
            return null
          }

          // Update last login
          await userService.updateLastLogin(user.id)

          // Get user's workspaces for session
          const userWorkspaces = await WorkspaceContext.getUserWorkspaces(user.id)

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            isVerified: user.isVerified,
            workspaces: userWorkspaces.map(workspace => ({
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
              role: workspace.role.name,
              permissions: workspace.role.permissions,
              color: workspace.role.color,
            })),
          }
        } catch (error) {
          logger.error('Auth error during login', { error: error.message })
          return null
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user data in JWT token
      if (user) {
        token.id = user.id
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.avatar = user.avatar
        token.isVerified = user.isVerified
        token.workspaces = user.workspaces
      }
      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id
        session.user.firstName = token.firstName
        session.user.lastName = token.lastName
        session.user.avatar = token.avatar
        session.user.isVerified = token.isVerified
        session.user.workspaces = token.workspaces || []
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Handle redirects after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },

    async signIn({ user }) {
      // Set initial workspace context after successful sign in
      try {
        if (user?.workspaces && user.workspaces.length > 0) {
          // Set the first workspace as default
          const defaultWorkspace = user.workspaces[0]
          WorkspaceContext.setCurrentWorkspace(defaultWorkspace.id)

          logger.info('Initial workspace context set', {
            userId: user.id,
            workspaceId: defaultWorkspace.id,
            workspaceName: defaultWorkspace.name,
          })
        }
      } catch (error) {
        logger.error('Failed to set initial workspace context', {
          userId: user?.id,
          error: error.message,
        })
        // Don't fail login if workspace context setting fails
      }

      return true
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async signIn(message) {},

    async signOut(message) {
      // Note: Workspace context clearing is handled client-side
      // or via API route when user logs out
    },

    async session(message) {
      // Optional: track active sessions
      logger.debug('Session accessed', { userId: message.session?.user?.id })
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
