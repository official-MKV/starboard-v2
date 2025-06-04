const { PrismaClient } = require('@prisma/client')
// import { PrismaClient } from '@prisma/client'
const bcrypt = require('bcryptjs')
// import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Starting database seed...')

  try {
    // Create test users
    const adminPassword = await bcrypt.hash('admin123', 12)
    const userPassword = await bcrypt.hash('user123', 12)

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@starboard.com' },
      update: {},
      create: {
        email: 'admin@starboard.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
    })

    const regularUser = await prisma.user.upsert({
      where: { email: 'user@starboard.com' },
      update: {},
      create: {
        email: 'user@starboard.com',
        password: userPassword,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
    })

    const startupUser = await prisma.user.upsert({
      where: { email: 'startup@example.com' },
      update: {},
      create: {
        email: 'startup@example.com',
        password: userPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true,
        isVerified: true,
        emailVerifiedAt: new Date(),
      },
    })

    console.log('✅ Users created')

    // Create demo workspace
    const workspace = await prisma.workspace.upsert({
      where: { slug: 'demo-accelerator' },
      update: {},
      create: {
        name: 'Demo Accelerator',
        slug: 'demo-accelerator',
        description: 'A demonstration accelerator program for testing Starboard features',
        creatorId: adminUser.id,
        settings: JSON.stringify({
          theme: 'default',
          allowPublicApplications: true,
          maxApplicationsPerUser: 3,
        }),
      },
    })

    console.log('✅ Workspace created')

    // Create roles
    const adminRole = await prisma.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: 'Admin',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: 'Admin',
        description: 'Full administrative access',
        isSystem: true,
        permissions: JSON.stringify([
          'workspace.manage',
          'users.manage',
          'applications.manage',
          'events.manage',
          'resources.manage',
          'messages.manage',
        ]),
      },
    })

    const memberRole = await prisma.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: 'Member',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: 'Member',
        description: 'Basic member access',
        isSystem: true,
        permissions: JSON.stringify([
          'applications.view',
          'applications.submit',
          'events.view',
          'events.register',
          'resources.view',
          'messages.send',
        ]),
      },
    })

    const startupRole = await prisma.role.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: 'Startup',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: 'Startup',
        description: 'Startup participant role',
        isSystem: false,
        permissions: JSON.stringify([
          'applications.submit',
          'events.view',
          'events.register',
          'resources.view',
          'messages.send',
        ]),
      },
    })

    console.log('✅ Roles created')

    // Create workspace members
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: adminUser.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    })

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: regularUser.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: regularUser.id,
        roleId: memberRole.id,
      },
    })

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: startupUser.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: startupUser.id,
        roleId: startupRole.id,
      },
    })

    console.log('✅ Workspace members created')

    // Create sample application
    const application = await prisma.application.upsert({
      where: {
        id: 'sample-application-id',
      },
      update: {},
      create: {
        id: 'sample-application-id',
        workspaceId: workspace.id,
        title: 'Summer 2024 Accelerator Program',
        description: 'A 12-week intensive program for early-stage startups',
        isPublic: true,
        isActive: true,
        openDate: new Date(),
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        maxApplicants: 50,
        formFields: JSON.stringify([
          {
            id: 'company_name',
            type: 'text',
            label: 'Company Name',
            required: true,
            placeholder: 'Enter your company name',
          },
          {
            id: 'description',
            type: 'textarea',
            label: 'Company Description',
            required: true,
            placeholder: 'Describe your company and what you do',
          },
          {
            id: 'team_size',
            type: 'select',
            label: 'Team Size',
            required: true,
            options: ['1-2', '3-5', '6-10', '10+'],
          },
          {
            id: 'funding_stage',
            type: 'select',
            label: 'Funding Stage',
            required: true,
            options: ['Pre-seed', 'Seed', 'Series A', 'Series B+'],
          },
          {
            id: 'pitch_deck',
            type: 'file',
            label: 'Pitch Deck',
            required: false,
            accept: '.pdf,.ppt,.pptx',
          },
        ]),
      },
    })

    console.log('✅ Sample application created')

    // Create sample application submissions (external applicants)
    await prisma.applicationSubmission.create({
      data: {
        applicationId: application.id,
        applicantEmail: 'founder@techstartup.com',
        applicantFirstName: 'Sarah',
        applicantLastName: 'Johnson',
        applicantPhone: '+1-555-0123',
        companyName: 'TechFlow AI',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        responses: {
          company_name: 'TechFlow AI',
          description: 'AI-powered workflow automation for small businesses',
          team_size: '3-5',
          funding_stage: 'Pre-seed',
        },
        progress: 100,
      },
    })

    await prisma.applicationSubmission.create({
      data: {
        applicationId: application.id,
        applicantEmail: 'ceo@greenenergy.co',
        applicantFirstName: 'Mike',
        applicantLastName: 'Chen',
        applicantPhone: '+1-555-0456',
        companyName: 'GreenFlow Energy',
        status: 'UNDER_REVIEW',
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        reviewedBy: adminUser.id,
        reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        score: 8.5,
        responses: {
          company_name: 'GreenFlow Energy',
          description: 'Sustainable energy solutions for urban development',
          team_size: '6-10',
          funding_stage: 'Seed',
        },
        progress: 100,
      },
    })

    // Create one application from existing user (startup that's already onboarded)
    await prisma.applicationSubmission.create({
      data: {
        applicationId: application.id,
        applicantEmail: startupUser.email,
        applicantFirstName: startupUser.firstName,
        applicantLastName: startupUser.lastName,
        companyName: 'StartupCo',
        userId: startupUser.id, // This user is already on the platform
        status: 'ONBOARDED',
        submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        responses: {
          company_name: 'StartupCo',
          description: 'Digital marketplace for local artisans',
          team_size: '1-2',
          funding_stage: 'Pre-seed',
        },
        progress: 100,
      },
    })

    console.log('✅ Sample application submissions created')

    // Create sample events
    const workshopEvent = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        creatorId: adminUser.id,
        title: 'Startup Pitch Workshop',
        description: 'Learn how to create compelling investor pitches',
        type: 'WORKSHOP',
        isPublic: true,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Virtual',
        virtualLink: 'https://zoom.us/meeting/demo',
        maxAttendees: 100,
      },
    })

    const networkingEvent = await prisma.event.create({
      data: {
        workspaceId: workspace.id,
        creatorId: adminUser.id,
        title: 'Founder Networking Night',
        description: 'Connect with other founders and mentors',
        type: 'NETWORKING',
        isPublic: true,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
        location: 'San Francisco, CA',
        maxAttendees: 50,
      },
    })

    console.log('✅ Sample events created')

    // Create sample resources
    await prisma.resource.create({
      data: {
        workspaceId: workspace.id,
        creatorId: adminUser.id,
        title: 'Startup Toolkit',
        description: 'Essential templates and guides for startups',
        type: 'DOCUMENT',
        isPublic: true,
        tags: ['templates', 'business-plan', 'legal'],
        category: 'Templates',
      },
    })

    await prisma.resource.create({
      data: {
        workspaceId: workspace.id,
        creatorId: adminUser.id,
        title: 'Fundraising 101 Video',
        description: 'Complete guide to raising your first round',
        type: 'VIDEO',
        isPublic: false,
        tags: ['fundraising', 'investment', 'video-course'],
        category: 'Education',
      },
    })

    console.log('✅ Sample resources created')

    // Create sample notifications
    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        userId: startupUser.id,
        title: 'Welcome to Demo Accelerator!',
        message: 'Welcome to our accelerator program. Check out the upcoming events and resources.',
        type: 'INFO',
      },
    })

    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        userId: startupUser.id,
        title: 'New Workshop Available',
        message: 'A new pitch workshop has been scheduled. Register now to secure your spot.',
        type: 'EVENT',
        actionUrl: `/events/${workshopEvent.id}`,
      },
    })

    console.log('✅ Sample notifications created')

    console.log('🎉 Database seeded successfully!')
    console.log('\n📧 Test credentials:')
    console.log('Admin: admin@starboard.com / admin123')
    console.log('User: user@starboard.com / user123')
    console.log('Startup: startup@example.com / user123')
    console.log('\n🏢 Workspace: demo-accelerator')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

seed()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
