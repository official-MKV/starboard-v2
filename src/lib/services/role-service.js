// lib/services/role-service.js
import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { EmailTemplateService } from './email-template-service.js'

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

          return {
            ...role,
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

      return {
        ...role,
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
      // Don't allow updating system roles
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        select: { isSystem: true, name: true, workspaceId: true },
      })

      if (existingRole?.isSystem) {
        throw new Error('Cannot update system role')
      }

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
            key: 'workspace.manage',
            label: 'Manage Workspace',
            description: 'Full workspace administration',
          },
          {
            key: 'workspace.settings',
            label: 'Workspace Settings',
            description: 'Modify workspace settings',
          },
          {
            key: 'workspace.view',
            label: 'View Workspace',
            description: 'View workspace information',
          },
        ],
      },
      {
        category: 'User Management',
        permissions: [
          {
            key: 'users.manage',
            label: 'Manage Users',
            description: 'Full user management access',
          },
          { key: 'users.invite', label: 'Invite Users', description: 'Send user invitations' },
          { key: 'users.view', label: 'View Users', description: 'View user profiles and lists' },
          {
            key: 'users.suspend',
            label: 'Suspend Users',
            description: 'Suspend and reactivate users',
          },
        ],
      },
      {
        category: 'Role Management',
        permissions: [
          { key: 'roles.manage', label: 'Manage Roles', description: 'Create and edit roles' },
          { key: 'roles.assign', label: 'Assign Roles', description: 'Assign roles to users' },
          { key: 'roles.view', label: 'View Roles', description: 'View role information' },
        ],
      },
      {
        category: 'Applications',
        permissions: [
          {
            key: 'applications.manage',
            label: 'Manage Applications',
            description: 'Full application control',
          },
          {
            key: 'applications.create',
            label: 'Create Applications',
            description: 'Create new application forms',
          },
          {
            key: 'applications.view',
            label: 'View Applications',
            description: 'View applications and submissions',
          },
          {
            key: 'applications.review',
            label: 'Review Applications',
            description: 'Review and score submissions',
          },
        ],
      },
      {
        category: 'Events',
        permissions: [
          { key: 'events.manage', label: 'Manage Events', description: 'Full event management' },
          { key: 'events.create', label: 'Create Events', description: 'Create new events' },
          {
            key: 'events.view',
            label: 'View Events',
            description: 'View events and registrations',
          },
          {
            key: 'events.moderate',
            label: 'Moderate Events',
            description: 'Moderate event content',
          },
        ],
      },
      {
        category: 'Resources',
        permissions: [
          {
            key: 'resources.manage',
            label: 'Manage Resources',
            description: 'Full resource management',
          },
          {
            key: 'resources.upload',
            label: 'Upload Resources',
            description: 'Upload new resources',
          },
          {
            key: 'resources.view',
            label: 'View Resources',
            description: 'Access resource library',
          },
          {
            key: 'resources.share',
            label: 'Share Resources',
            description: 'Share resources externally',
          },
        ],
      },
      {
        category: 'Communication',
        permissions: [
          { key: 'chat.manage', label: 'Manage Chat', description: 'Full chat administration' },
          { key: 'chat.moderate', label: 'Moderate Chat', description: 'Moderate chat content' },
          { key: 'chat.create_groups', label: 'Create Groups', description: 'Create chat groups' },
          { key: 'chat.view', label: 'View Chat', description: 'Access chat features' },
        ],
      },
      {
        category: 'Email Templates',
        permissions: [
          {
            key: 'templates.manage',
            label: 'Manage Templates',
            description: 'Create and edit email templates',
          },
          { key: 'templates.view', label: 'View Templates', description: 'View email templates' },
        ],
      },
      {
        category: 'Analytics',
        permissions: [
          {
            key: 'analytics.view',
            label: 'View Analytics',
            description: 'Access analytics and reports',
          },
          { key: 'analytics.export', label: 'Export Data', description: 'Export analytics data' },
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
