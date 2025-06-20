const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateInvitationStatus() {
  try {
    console.log('🔍 Starting invitation status update...')

    // Get all unaccepted invitations
    const pendingInvitations = await prisma.userInvitation.findMany({
      where: {
        isAccepted: false,
      },
      select: {
        id: true,
        email: true,
        workspaceId: true,
        isAccepted: true,
        acceptedAt: true,
      },
    })

    console.log(`📧 Found ${pendingInvitations.length} pending invitations`)

    if (pendingInvitations.length === 0) {
      console.log('✅ No pending invitations to process')
      return
    }

    // Get all user emails for comparison
    const existingUsers = await prisma.user.findMany({
      select: {
        email: true,
      },
    })

    const userEmails = new Set(existingUsers.map(user => user.email.toLowerCase()))
    console.log(`👥 Found ${userEmails.size} existing users`)

    // Find invitations that should be marked as accepted
    const invitationsToUpdate = pendingInvitations.filter(invitation =>
      userEmails.has(invitation.email.toLowerCase())
    )

    console.log(`🔄 Found ${invitationsToUpdate.length} invitations to update`)

    if (invitationsToUpdate.length === 0) {
      console.log('✅ No invitations need updating')
      return
    }

    // Update invitations in batch
    const updatePromises = invitationsToUpdate.map(invitation =>
      prisma.userInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          isAccepted: true,
          acceptedAt: new Date(),
        },
      })
    )

    const results = await Promise.all(updatePromises)

    console.log(`✅ Successfully updated ${results.length} invitations:`)

    // Log details of updated invitations
    invitationsToUpdate.forEach((invitation, index) => {
      console.log(`   📩 ${invitation.email} (ID: ${invitation.id})`)
    })

    // Optional: Show summary statistics
    const summary = await getUpdateSummary()
    console.log('\n📊 Summary:')
    console.log(`   Total invitations: ${summary.totalInvitations}`)
    console.log(`   Accepted invitations: ${summary.acceptedInvitations}`)
    console.log(`   Pending invitations: ${summary.pendingInvitations}`)
  } catch (error) {
    console.error('❌ Error updating invitation status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function getUpdateSummary() {
  const totalInvitations = await prisma.userInvitation.count()
  const acceptedInvitations = await prisma.userInvitation.count({
    where: { isAccepted: true },
  })
  const pendingInvitations = await prisma.userInvitation.count({
    where: { isAccepted: false },
  })

  return {
    totalInvitations,
    acceptedInvitations,
    pendingInvitations,
  }
}

// Optional: Add a dry-run function to preview changes
async function previewUpdates() {
  try {
    console.log('🔍 Previewing potential updates...')

    const pendingInvitations = await prisma.userInvitation.findMany({
      where: {
        isAccepted: false,
      },
      select: {
        id: true,
        email: true,
        workspaceId: true,
        sentAt: true,
      },
    })

    const existingUsers = await prisma.user.findMany({
      select: {
        email: true,
        createdAt: true,
      },
    })

    const userEmails = new Set(existingUsers.map(user => user.email.toLowerCase()))

    const invitationsToUpdate = pendingInvitations.filter(invitation =>
      userEmails.has(invitation.email.toLowerCase())
    )

    console.log(`📋 Preview Results:`)
    console.log(`   Total pending invitations: ${pendingInvitations.length}`)
    console.log(`   Invitations that will be updated: ${invitationsToUpdate.length}`)

    if (invitationsToUpdate.length > 0) {
      console.log(`\n📧 Invitations to be marked as accepted:`)
      invitationsToUpdate.forEach(invitation => {
        console.log(`   - ${invitation.email} (sent: ${invitation.sentAt.toLocaleDateString()})`)
      })
    }
  } catch (error) {
    console.error('❌ Error in preview:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--preview') || args.includes('-p')) {
    await previewUpdates()
  } else {
    await updateInvitationStatus()
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

module.exports = {
  updateInvitationStatus,
  previewUpdates,
}
