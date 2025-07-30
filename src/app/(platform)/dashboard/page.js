import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { QuickStats } from "@/components/dashboard/quick-stats"
import { LiveApplications } from "@/components/dashboard/live-applications"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) {
    redirect("/auth/login")
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          <DashboardHeader
            title={`Welcome back, ${user.firstName}!`}
            description="Here's what's happening with your accelerator programs"
          />

          {/* Quick Stats Overview */}
          <QuickStats userId={user.id} workspaces={user.workspaces} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Live Applications - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <LiveApplications userId={user.id} />
            </div>

            {/* Upcoming Events - Takes 1 column on xl screens */}
            <div className="xl:col-span-1">
              <UpcomingEvents userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
