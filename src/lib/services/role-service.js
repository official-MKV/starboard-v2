// lib/services/role-service.js
import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { EmailTemplateService } from './email-template-service.js'
import { PERMISSIONS } from '@/lib/utils/permissions'
/**
 * Role Management Service
 * Handles role CRUD operations and onboarding form management
 */
export class RoleService {
  /**
   * Create a new role with optional onboarding form and email template
   * @param {string} workspaceId - Workspace ID
   * @param {Object} roleData - Role creation data
   * @param {string} creatorId - Creator user ID
   * @returns {Object} - Created role with email template
   */
  static async create(workspaceId, roleData, creatorId) {
    try {
      const role = await prisma.$transaction(async tx => {
        // Create the role
        const newRole = await tx.role.create({
          data: {
            workspaceId,
            name: roleData.name,
            description: roleData.description,
            color: roleData.color || '#3b82f6',
            permissions: roleData.permissions || [],
            requiresOnboarding: roleData.requiresOnboarding || false,
            onboardingForm: roleData.onboardingForm || null,
            isDefault: roleData.isDefault || false,
          },
          include: {
            _count: {
              select: { members: true },
            },
          },
        })

        // Create custom invitation email template for this role
        let emailTemplate = null
        if (roleData.createEmailTemplate) {
          const templateData = {
            name: `${roleData.name} Invitation`,
            description: `Custom invitation template for ${roleData.name} role`,
            type: 'INVITATION',
            subject:
              roleData.emailTemplate?.subject ||
              `You're invited to join !{{workspace_name}} as ${roleData.name}`,
            content:
              roleData.emailTemplate?.content || this.getDefaultInvitationTemplate(roleData.name),
            isActive: true,
            isDefault: false,
          }

          emailTemplate = await EmailTemplateService.create(workspaceId, templateData, creatorId)
        }

        return { ...newRole, emailTemplate }
      })

      logger.info('Role created', {
        roleId: role.id,
        roleName: role.name,
        workspaceId,
        requiresOnboarding: role.requiresOnboarding,
        hasEmailTemplate: !!role.emailTemplate,
        createdBy: creatorId,
      })

      return role
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A role with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get default invitation template for a role
   * @param {string} roleName - Role name
   * @returns {string} - Template content
   */
  static getDefaultInvitationTemplate(roleName) {
    return `Hello !{{first_name}},

!{{inviter_name}} has invited you to join !{{workspace_name}} as a ${roleName}.

{{message}}

As a ${roleName}, you'll have access to specific features and responsibilities within our workspace.

Click the link below to accept your invitation:
!{{invitation_link}}

This invitation will expire on {{expiry_date}}.

We're excited to have you on board!

Best regards,
The {{workspace_name}} Team`
  }

  /**
   * Get all roles for a workspace with email templates
   * @param {string} workspaceId - Workspace ID
   * @returns {Array} - Array of roles
   */
  static async findByWorkspace(workspaceId) {
    try {
      const roles = await prisma.role.findMany({
        where: { workspaceId },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: [{ isSystem: 'desc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
      })

      // Get associated email templates for each role
      const rolesWithTemplates = await Promise.all(
        roles.map(async role => {
          const emailTemplates = await prisma.emailTemplate.findMany({
            where: {
              workspaceId,
              type: 'INVITATION',
              name: { contains: role.name },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              subject: true,
              isDefault: true,
            },
          })

          // Parse permissions if it's a JSON string
          let permissions = role.permissions
          if (typeof permissions === 'string') {
            try {
              permissions = JSON.parse(permissions)
            } catch (e) {
              permissions = []
            }
          }
          // Ensure permissions is always an array
          if (!Array.isArray(permissions)) {
            permissions = []
          }

          // Parse onboardingForm if it's a JSON string
          let onboardingForm = role.onboardingForm
          if (typeof onboardingForm === 'string') {
            try {
              onboardingForm = JSON.parse(onboardingForm)
            } catch (e) {
              onboardingForm = null
            }
          }

          return {
            ...role,
            permissions,
            onboardingForm,
            emailTemplates,
          }
        })
      )

      return rolesWithTemplates
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get role by ID with full details including email templates
   * @param {string} roleId - Role ID
   * @returns {Object|null} - Role with details
   */
  static async findById(roleId) {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true,
                },
              },
            },
            orderBy: { joinedAt: 'desc' },
          },
          _count: {
            select: { members: true },
          },
        },
      })

      if (!role) return null

      // Get associated email templates
      const emailTemplates = await prisma.emailTemplate.findMany({
        where: {
          workspaceId: role.workspaceId,
          type: 'INVITATION',
          name: { contains: role.name },
          isActive: true,
        },
      })

      // Parse permissions if it's a JSON string
      let permissions = role.permissions
      if (typeof permissions === 'string') {
        try {
          permissions = JSON.parse(permissions)
        } catch (e) {
          permissions = []
        }
      }
      // Ensure permissions is always an array
      if (!Array.isArray(permissions)) {
        permissions = []
      }

      // Parse onboardingForm if it's a JSON string
      let onboardingForm = role.onboardingForm
      if (typeof onboardingForm === 'string') {
        try {
          onboardingForm = JSON.parse(onboardingForm)
        } catch (e) {
          onboardingForm = null
        }
      }

      return {
        ...role,
        permissions,
        onboardingForm,
        emailTemplates,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Update role and optionally update/create email template
   * @param {string} roleId - Role ID
   * @param {Object} updates - Fields to update
   * @returns {Object} - Updated role
   */
  static async update(roleId, updates) {
    try {
      const role = await prisma.$transaction(async tx => {
        // Update the role
        const updatedRole = await tx.role.update({
          where: { id: roleId },
          data: {
            name: updates.name,
            description: updates.description,
            color: updates.color,
            permissions: updates.permissions,
            requiresOnboarding: updates.requiresOnboarding,
            onboardingForm: updates.onboardingForm,
            isDefault: updates.isDefault,
            canMentor: updates.canMentor, // ✅ Added missing field
            canBeMentee: updates.canBeMentee, // ✅ Added missing field
          },
          include: {
            _count: {
              select: { members: true },
            },
          },
        })

        // Update email template if provided
        if (updates.emailTemplate && updates.emailTemplate.id) {
          await EmailTemplateService.update(updates.emailTemplate.id, {
            name: `${updatedRole.name} Invitation`,
            subject: updates.emailTemplate.subject,
            content: updates.emailTemplate.content,
          })
        }

        return updatedRole
      })

      logger.info('Role updated', {
        roleId,
        roleName: role.name,
        updatedFields: Object.keys(updates),
        mentorshipCapabilities: {
          canMentor: role.canMentor,
          canBeMentee: role.canBeMentee,
        },
      })

      return role
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A role with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }
  /**
   * Delete role and associated email templates (only if no members)
   * @param {string} roleId - Role ID
   * @returns {boolean} - Success
   */
  static async delete(roleId) {
    try {
      // Check if role is system role
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { isSystem: true, name: true, workspaceId: true },
      })

      if (role?.isSystem) {
        throw new Error('Cannot delete system role')
      }

      // Check if role has members
      const memberCount = await prisma.workspaceMember.count({
        where: { roleId },
      })

      if (memberCount > 0) {
        throw new Error('Cannot delete role with existing members')
      }

      await prisma.$transaction(async tx => {
        // Delete associated email templates
        await tx.emailTemplate.deleteMany({
          where: {
            workspaceId: role.workspaceId,
            type: 'INVITATION',
            name: { contains: role.name },
          },
        })

        // Delete the role
        await tx.role.delete({
          where: { id: roleId },
        })
      })

      logger.info('Role deleted', {
        roleId,
        roleName: role.name,
      })

      return true
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get available permissions grouped by category
   * @returns {Array} - Permission categories
   */
static getAvailablePermissions() {
    return [
      {
        category: 'Workspace Management',
        permissions: [
          {
            key: PERMISSIONS.WORKSPACE_VIEW,
            label: 'View Workspace',
            description: 'View workspace information and basic details',
          },
          {
            key: PERMISSIONS.WORKSPACE_MANAGE,
            label: 'Manage Workspace',
            description: 'Full workspace administration and control',
          },
          {
            key: PERMISSIONS.WORKSPACE_SETTINGS,
            label: 'Workspace Settings',
            description: 'Modify workspace settings and configuration',
          },
          {
            key: PERMISSIONS.WORKSPACE_DELETE,
            label: 'Delete Workspace',
            description: 'Delete workspace (admin only)',
          },
          {
            key: PERMISSIONS.WORKSPACE_EXPORT,
            label: 'Export Workspace Data',
            description: 'Export workspace information and data',
          },
        ],
      },
      {
        category: 'User Management',
        permissions: [
          {
            key: PERMISSIONS.USERS_VIEW,
            label: 'View Users',
            description: 'View user profiles and lists',
          },
          {
            key: PERMISSIONS.USERS_MANAGE,
            label: 'Manage Users',
            description: 'Full user management access',
          },
          {
            key: PERMISSIONS.USERS_CREATE,
            label: 'Create Users',
            description: 'Create new user accounts',
          },
          {
            key: PERMISSIONS.USERS_EDIT,
            label: 'Edit Users',
            description: 'Edit user profiles and information',
          },
          {
            key: PERMISSIONS.USERS_DELETE,
            label: 'Delete Users',
            description: 'Delete user accounts',
          },
          {
            key: PERMISSIONS.USERS_INVITE,
            label: 'Invite Users',
            description: 'Send user invitations',
          },
          {
            key: PERMISSIONS.USERS_SUSPEND,
            label: 'Suspend Users',
            description: 'Suspend and reactivate users',
          },
          {
            key: PERMISSIONS.USERS_EXPORT,
            label: 'Export User Data',
            description: 'Export user information and reports',
          },
        ],
      },
      {
        category: 'Role Management',
        permissions: [
          {
            key: PERMISSIONS.ROLES_VIEW,
            label: 'View Roles',
            description: 'View role information and permissions',
          },
          {
            key: PERMISSIONS.ROLES_MANAGE,
            label: 'Manage Roles',
            description: 'Full role management access',
          },
          {
            key: PERMISSIONS.ROLES_CREATE,
            label: 'Create Roles',
            description: 'Create new roles and permissions',
          },
          {
            key: PERMISSIONS.ROLES_EDIT,
            label: 'Edit Roles',
            description: 'Edit existing roles and permissions',
          },
          {
            key: PERMISSIONS.ROLES_DELETE,
            label: 'Delete Roles',
            description: 'Delete roles (when not assigned)',
          },
          {
            key: PERMISSIONS.ROLES_ASSIGN,
            label: 'Assign Roles',
            description: 'Assign roles to users',
          },
        ],
      },
      {
        category: 'Applications',
        permissions: [
          {
            key: PERMISSIONS.APPLICATIONS_VIEW,
            label: 'View Applications',
            description: 'View applications and submissions',
          },
          {
            key: PERMISSIONS.APPLICATIONS_MANAGE,
            label: 'Manage Applications',
            description: 'Full application control and administration',
          },
          {
            key: PERMISSIONS.APPLICATIONS_CREATE,
            label: 'Create Applications',
            description: 'Create new application forms',
          },
          {
            key: PERMISSIONS.APPLICATIONS_EDIT,
            label: 'Edit Applications',
            description: 'Edit application forms and settings',
          },
          {
            key: PERMISSIONS.APPLICATIONS_DELETE,
            label: 'Delete Applications',
            description: 'Delete application forms',
          },
          {
            key: PERMISSIONS.APPLICATIONS_REVIEW,
            label: 'Review Applications',
            description: 'Review and score submissions',
          },
          {
            key: PERMISSIONS.APPLICATIONS_APPROVE,
            label: 'Approve Applications',
            description: 'Approve application submissions',
          },
          {
            key: PERMISSIONS.APPLICATIONS_REJECT,
            label: 'Reject Applications',
            description: 'Reject application submissions',
          },
          {
            key: PERMISSIONS.APPLICATIONS_EXPORT,
            label: 'Export Applications',
            description: 'Export application data and reports',
          },
          {
            key: PERMISSIONS.EVALUATION_SCORE,
            label: 'Score Submissions',
            description: 'Score submissions in evaluation pipeline (Evaluator)',
          },
          {
            key: PERMISSIONS.EVALUATION_VIEW_SCORES,
            label: 'View Evaluation Scores',
            description: 'View aggregate and individual evaluation scores',
          },
          {
            key: PERMISSIONS.EVALUATION_MANAGE,
            label: 'Manage Evaluations',
            description: 'Configure evaluation steps and criteria',
          },
          {
            key: PERMISSIONS.EVALUATION_ADVANCE,
            label: 'Advance Candidates',
            description: 'Manually advance candidates to next evaluation step',
          },
          {
            key: PERMISSIONS.EVALUATION_ADMIT,
            label: 'Admit Candidates',
            description: 'Admit candidates (final approval)',
          },
        ],
      },
      {
        category: 'Events',
        permissions: [
          {
            key: PERMISSIONS.EVENTS_VIEW,
            label: 'View Events',
            description: 'View events and registrations',
          },
          {
            key: PERMISSIONS.EVENTS_MANAGE,
            label: 'Manage Events',
            description: 'Full event management access',
          },
          {
            key: PERMISSIONS.EVENTS_CREATE,
            label: 'Create Events',
            description: 'Create new events',
          },
          {
            key: PERMISSIONS.EVENTS_EDIT,
            label: 'Edit Events',
            description: 'Edit event details and settings',
          },
          {
            key: PERMISSIONS.EVENTS_DELETE,
            label: 'Delete Events',
            description: 'Delete events',
          },
          {
            key: PERMISSIONS.EVENTS_MODERATE,
            label: 'Moderate Events',
            description: 'Moderate event content and discussions',
          },
          {
            key: PERMISSIONS.EVENTS_PUBLISH,
            label: 'Publish Events',
            description: 'Publish and unpublish events',
          },
          {
            key: PERMISSIONS.EVENTS_EXPORT,
            label: 'Export Event Data',
            description: 'Export event and registration data',
          },
        ],
      },
      {
        category: 'Demo Day',
        permissions: [
          {
            key: PERMISSIONS.DEMO_DAY_PARTICIPATE,
            label: 'Participate in Demo Day',
            description: 'Submit projects and participate in demo day events',
          },
          {
            key: PERMISSIONS.DEMO_DAY_JUDGE,
            label: 'Judge Demo Day',
            description: 'Score and review demo day submissions',
          },
          {
            key: PERMISSIONS.DEMO_DAY_MANAGE,
            label: 'Manage Demo Day',
            description: 'Full demo day administration and control',
          },
        ],
      },
      {
        category: 'Resources',
        permissions: [
          {
            key: PERMISSIONS.RESOURCES_VIEW,
            label: 'View Resources',
            description: 'Access and view resource library',
          },
          {
            key: PERMISSIONS.RESOURCES_MANAGE,
            label: 'Manage Resources',
            description: 'Full resource management access',
          },
          {
            key: PERMISSIONS.RESOURCES_CREATE,
            label: 'Create Resources',
            description: 'Create new resource entries',
          },
          {
            key: PERMISSIONS.RESOURCES_EDIT,
            label: 'Edit Resources',
            description: 'Edit resource information and metadata',
          },
          {
            key: PERMISSIONS.RESOURCES_DELETE,
            label: 'Delete Resources',
            description: 'Delete resources from library',
          },
          {
            key: PERMISSIONS.RESOURCES_UPLOAD,
            label: 'Upload Resources',
            description: 'Upload new resource files',
          },
          {
            key: PERMISSIONS.RESOURCES_DOWNLOAD,
            label: 'Download Resources',
            description: 'Download resource files',
          },
          {
            key: PERMISSIONS.RESOURCES_SHARE,
            label: 'Share Resources',
            description: 'Share resources externally',
          },
        ],
      },
      {
        category: 'Communication',
        permissions: [
          {
            key: PERMISSIONS.CHAT_VIEW,
            label: 'View Chat',
            description: 'Access and view chat features',
          },
          {
            key: PERMISSIONS.CHAT_MANAGE,
            label: 'Manage Chat',
            description: 'Full chat administration access',
          },
          {
            key: PERMISSIONS.CHAT_CREATE_GROUPS,
            label: 'Create Chat Groups',
            description: 'Create new chat groups and channels',
          },
          {
            key: PERMISSIONS.CHAT_EDIT_GROUPS,
            label: 'Edit Chat Groups',
            description: 'Edit chat group settings and details',
          },
          {
            key: PERMISSIONS.CHAT_DELETE_GROUPS,
            label: 'Delete Chat Groups',
            description: 'Delete chat groups and channels',
          },
          {
            key: PERMISSIONS.CHAT_MODERATE,
            label: 'Moderate Chat',
            description: 'Moderate chat content and users',
          },
          {
            key: PERMISSIONS.CHAT_SEND_MESSAGES,
            label: 'Send Messages',
            description: 'Send messages in chat',
          },
          {
            key: PERMISSIONS.CHAT_DELETE_MESSAGES,
            label: 'Delete Messages',
            description: 'Delete chat messages',
          },
        ],
      },
      {
        category: 'Email Templates',
        permissions: [
          {
            key: PERMISSIONS.TEMPLATES_VIEW,
            label: 'View Templates',
            description: 'View email templates and content',
          },
          {
            key: PERMISSIONS.TEMPLATES_MANAGE,
            label: 'Manage Templates',
            description: 'Full template management access',
          },
          {
            key: PERMISSIONS.TEMPLATES_CREATE,
            label: 'Create Templates',
            description: 'Create new email templates',
          },
          {
            key: PERMISSIONS.TEMPLATES_EDIT,
            label: 'Edit Templates',
            description: 'Edit existing email templates',
          },
          {
            key: PERMISSIONS.TEMPLATES_DELETE,
            label: 'Delete Templates',
            description: 'Delete email templates',
          },
          {
            key: PERMISSIONS.TEMPLATES_SEND,
            label: 'Send Templates',
            description: 'Send emails using templates',
          },
        ],
      },
      {
        category: 'Notifications',
        permissions: [
          {
            key: PERMISSIONS.NOTIFICATIONS_VIEW,
            label: 'View Notifications',
            description: 'View notification history and settings',
          },
          {
            key: PERMISSIONS.NOTIFICATIONS_MANAGE,
            label: 'Manage Notifications',
            description: 'Full notification system management',
          },
          {
            key: PERMISSIONS.NOTIFICATIONS_CREATE,
            label: 'Create Notifications',
            description: 'Create custom notifications',
          },
          {
            key: PERMISSIONS.NOTIFICATIONS_SEND,
            label: 'Send Notifications',
            description: 'Send notifications to users',
          },
        ],
      },
      {
        category: 'Analytics & Reports',
        permissions: [
          {
            key: PERMISSIONS.ANALYTICS_VIEW,
            label: 'View Analytics',
            description: 'Access analytics dashboards and reports',
          },
          {
            key: PERMISSIONS.ANALYTICS_MANAGE,
            label: 'Manage Analytics',
            description: 'Configure analytics settings and reports',
          },
          {
            key: PERMISSIONS.ANALYTICS_EXPORT,
            label: 'Export Analytics',
            description: 'Export analytics data and reports',
          },
          {
            key: PERMISSIONS.ANALYTICS_CREATE_REPORTS,
            label: 'Create Reports',
            description: 'Create custom analytics reports',
          },
        ],
      },
      {
        category: 'File Management',
        permissions: [
          {
            key: PERMISSIONS.FILES_VIEW,
            label: 'View Files',
            description: 'View and browse file system',
          },
          {
            key: PERMISSIONS.FILES_MANAGE,
            label: 'Manage Files',
            description: 'Full file management access',
          },
          {
            key: PERMISSIONS.FILES_UPLOAD,
            label: 'Upload Files',
            description: 'Upload new files',
          },
          {
            key: PERMISSIONS.FILES_DELETE,
            label: 'Delete Files',
            description: 'Delete files from system',
          },
          {
            key: PERMISSIONS.FILES_SHARE,
            label: 'Share Files',
            description: 'Share files with external users',
          },
        ],
      },
      {
        category: 'Settings & Configuration',
        permissions: [
          {
            key: PERMISSIONS.SETTINGS_VIEW,
            label: 'View Settings',
            description: 'View system and application settings',
          },
          {
            key: PERMISSIONS.SETTINGS_MANAGE,
            label: 'Manage Settings',
            description: 'Full settings management access',
          },
          {
            key: PERMISSIONS.SETTINGS_SYSTEM,
            label: 'System Settings',
            description: 'Modify core system settings',
          },
          {
            key: PERMISSIONS.SETTINGS_INTEGRATIONS,
            label: 'Integration Settings',
            description: 'Configure third-party integrations',
          },
        ],
      },
      {
        category: 'Billing & Subscriptions',
        permissions: [
          {
            key: PERMISSIONS.BILLING_VIEW,
            label: 'View Billing',
            description: 'View billing information and invoices',
          },
          {
            key: PERMISSIONS.BILLING_MANAGE,
            label: 'Manage Billing',
            description: 'Full billing and subscription management',
          },
          {
            key: PERMISSIONS.BILLING_EXPORT,
            label: 'Export Billing Data',
            description: 'Export billing reports and data',
          },
        ],
      },
      {
        category: 'API & Integrations',
        permissions: [
          {
            key: PERMISSIONS.API_VIEW,
            label: 'View API Settings',
            description: 'View API keys and integration settings',
          },
          {
            key: PERMISSIONS.API_MANAGE,
            label: 'Manage API',
            description: 'Full API and integration management',
          },
          {
            key: PERMISSIONS.API_CREATE_KEYS,
            label: 'Create API Keys',
            description: 'Generate new API keys',
          },
          {
            key: PERMISSIONS.API_DELETE_KEYS,
            label: 'Delete API Keys',
            description: 'Revoke and delete API keys',
          },
        ],
      },
      {
        category: 'Audit & Security',
        permissions: [
          {
            key: PERMISSIONS.AUDIT_VIEW,
            label: 'View Audit Logs',
            description: 'Access system audit logs and security events',
          },
          {
            key: PERMISSIONS.AUDIT_EXPORT,
            label: 'Export Audit Data',
            description: 'Export audit logs and security reports',
          },
        ],
      },
    ]
  }
  /**
   * Create onboarding form configuration
   * @param {Array} fields - Form field definitions
   * @returns {Object} - Onboarding form config
   */
  static createOnboardingForm(fields = []) {
    const defaultFields = [
      {
        type: 'text',
        name: 'firstName',
        label: 'First Name',
        required: true,
        order: 1,
      },
      {
        type: 'text',
        name: 'lastName',
        label: 'Last Name',
        required: true,
        order: 2,
      },
      {
        type: 'email',
        name: 'email',
        label: 'Email Address',
        required: true,
        order: 3,
        readonly: true, // Pre-filled from invitation
      },
    ]

    const customFields = fields.map((field, index) => ({
      ...field,
      order: field.order || defaultFields.length + index + 1,
    }))

    return {
      fields: [...defaultFields, ...customFields].sort((a, b) => a.order - b.order),
      settings: {
        title: 'Complete Your Profile',
        description: 'Please provide the required information to complete your registration.',
        submitButtonText: 'Complete Registration',
      },
    }
  }

  /**
   * Get available onboarding field types
   * @returns {Array} - Field type definitions
   */
  static getOnboardingFieldTypes() {
    return [
      {
        type: 'text',
        label: 'Short Text',
        description: 'Single line text input',
        icon: 'Type',
        props: ['placeholder', 'maxLength', 'pattern'],
      },
      {
        type: 'textarea',
        label: 'Long Text',
        description: 'Multi-line text area',
        icon: 'FileText',
        props: ['placeholder', 'maxLength', 'rows'],
      },
      {
        type: 'email',
        label: 'Email',
        description: 'Email address with validation',
        icon: 'Mail',
        props: ['placeholder'],
      },
      {
        type: 'phone',
        label: 'Phone',
        description: 'Phone number input',
        icon: 'Phone',
        props: ['placeholder', 'format'],
      },
      {
        type: 'url',
        label: 'Website URL',
        description: 'URL with validation',
        icon: 'Globe',
        props: ['placeholder'],
      },
      {
        type: 'select',
        label: 'Dropdown',
        description: 'Single selection dropdown',
        icon: 'List',
        props: ['options', 'placeholder'],
      },
      {
        type: 'radio',
        label: 'Radio Buttons',
        description: 'Single choice from options',
        icon: 'CheckCircle',
        props: ['options'],
      },
      {
        type: 'checkbox',
        label: 'Checkboxes',
        description: 'Multiple selections',
        icon: 'CheckSquare',
        props: ['options'],
      },
      {
        type: 'file',
        label: 'File Upload',
        description: 'Single file upload',
        icon: 'Upload',
        props: ['acceptedTypes', 'maxSize'],
      },
      {
        type: 'image',
        label: 'Image Upload',
        description: 'Profile image upload',
        icon: 'Image',
        props: ['maxSize', 'dimensions'],
      },
      {
        type: 'date',
        label: 'Date',
        description: 'Date picker',
        icon: 'Calendar',
        props: ['minDate', 'maxDate'],
      },
      {
        type: 'location',
        label: 'Location',
        description: 'City, Country input',
        icon: 'MapPin',
        props: ['placeholder'],
      },
    ]
  }

  /**
   * Validate onboarding form configuration
   * @param {Object} formConfig - Form configuration
   * @returns {Object} - Validation result
   */
  static validateOnboardingForm(formConfig) {
    const errors = []
    const warnings = []

    if (!formConfig || !formConfig.fields) {
      errors.push('Form configuration is required')
      return { valid: false, errors, warnings }
    }

    const fields = formConfig.fields
    if (!Array.isArray(fields) || fields.length === 0) {
      errors.push('At least one form field is required')
      return { valid: false, errors, warnings }
    }

    // Validate each field
    fields.forEach((field, index) => {
      if (!field.name) {
        errors.push(`Field ${index + 1}: name is required`)
      }
      if (!field.label) {
        errors.push(`Field ${index + 1}: label is required`)
      }
      if (!field.type) {
        errors.push(`Field ${index + 1}: type is required`)
      }

      // Check for duplicate field names
      const duplicates = fields.filter(f => f.name === field.name)
      if (duplicates.length > 1) {
        errors.push(`Duplicate field name: ${field.name}`)
      }
    })

    // Check for required basic fields
    const requiredFields = ['firstName', 'lastName', 'email']
    requiredFields.forEach(fieldName => {
      const field = fields.find(f => f.name === fieldName)
      if (!field) {
        warnings.push(`Missing recommended field: ${fieldName}`)
      } else if (!field.required) {
        warnings.push(`Recommended field should be required: ${fieldName}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Get role statistics
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} - Role statistics
   */
  static async getStatistics(workspaceId) {
    try {
      const [totalRoles, rolesWithOnboarding, totalMembers, membersByRole] = await Promise.all([
        prisma.role.count({
          where: { workspaceId },
        }),
        prisma.role.count({
          where: { workspaceId, requiresOnboarding: true },
        }),
        prisma.workspaceMember.count({
          where: { workspaceId, isActive: true },
        }),
        prisma.role.findMany({
          where: { workspaceId },
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: { members: true },
            },
          },
        }),
      ])

      return {
        totalRoles,
        rolesWithOnboarding,
        totalMembers,
        averageMembersPerRole: totalMembers / totalRoles || 0,
        memberDistribution: membersByRole.map(role => ({
          roleId: role.id,
          roleName: role.name,
          roleColor: role.color,
          memberCount: role._count.members,
          percentage:
            totalMembers > 0 ? ((role._count.members / totalMembers) * 100).toFixed(1) : 0,
        })),
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Duplicate role with new name and email template
   * @param {string} roleId - Role ID to duplicate
   * @param {string} newName - New role name
   * @param {string} creatorId - Creator user ID
   * @returns {Object} - Duplicated role
   */
  static async duplicate(roleId, newName, creatorId) {
    try {
      const originalRole = await prisma.role.findUnique({
        where: { id: roleId },
      })

      if (!originalRole) {
        throw new Error('Role not found')
      }

      if (originalRole.isSystem) {
        throw new Error('Cannot duplicate system role')
      }

      const duplicatedRole = await prisma.$transaction(async tx => {
        // Create duplicated role
        const newRole = await tx.role.create({
          data: {
            workspaceId: originalRole.workspaceId,
            name: newName,
            description: originalRole.description ? `${originalRole.description} (Copy)` : null,
            color: originalRole.color,
            permissions: originalRole.permissions,
            requiresOnboarding: originalRole.requiresOnboarding,
            onboardingForm: originalRole.onboardingForm,
            isDefault: false, // Never duplicate as default
          },
          include: {
            _count: {
              select: { members: true },
            },
          },
        })

        // Duplicate email template if one exists
        const originalTemplate = await tx.emailTemplate.findFirst({
          where: {
            workspaceId: originalRole.workspaceId,
            type: 'INVITATION',
            name: { contains: originalRole.name },
            isActive: true,
          },
        })

        let emailTemplate = null
        if (originalTemplate) {
          const templateData = {
            name: `${newName} Invitation`,
            description: `Custom invitation template for ${newName} role (copied)`,
            type: 'INVITATION',
            subject: originalTemplate.subject.replace(originalRole.name, newName),
            content: originalTemplate.content.replace(new RegExp(originalRole.name, 'g'), newName),
            isActive: true,
            isDefault: false,
          }

          emailTemplate = await EmailTemplateService.create(
            originalRole.workspaceId,
            templateData,
            creatorId
          )
        }

        return { ...newRole, emailTemplate }
      })

      logger.info('Role duplicated', {
        originalRoleId: roleId,
        duplicatedRoleId: duplicatedRole.id,
        newName,
        hasEmailTemplate: !!duplicatedRole.emailTemplate,
      })

      return duplicatedRole
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A role with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }
}

// Export convenience methods
export const {
  create,
  findByWorkspace,
  findById,
  update,
  delete: deleteRole,
  getAvailablePermissions,
  createOnboardingForm,
  getOnboardingFieldTypes,
  validateOnboardingForm,
  getStatistics,
  duplicate,
} = RoleService

export default RoleService
