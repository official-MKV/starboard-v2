import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  Calendar,
  FileText,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="">
        <DashboardHeader
          title={`Welcome back, ${user.firstName}!`}
          description="Here's what's happening with your accelerator programs"
        />

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Quick Stats & Action Cards Combined */}
          <QuickStats userId={user.id} workspaces={user.workspaces} />

          {/* Recent Activity & Workspace Overview */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <RecentActivity userId={user.id} />
            </div>

            {/* Workspace Sidebar */}
            <div className="space-y-6">
              {/* Current Workspaces */}
              <Card className="starboard-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Your Workspaces</CardTitle>
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.workspaces?.length > 0 ? (
                    user.workspaces.map(workspace => (
                      <div
                        key={workspace.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-snow-200 hover:bg-snow-300 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-charcoal-800">{workspace.name}</p>
                          <p className="text-sm text-slate-gray-600">{workspace.role}</p>
                        </div>
                        {/* <Button variant="ghost" size="sm" asChild>
                          <Link href={`/workspace/${workspace.slug}`}>Open</Link>
                        </Button> */}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-gray-600 mb-2">No workspaces yet</p>
                      <Button variant="outline" size="sm">
                        Join Workspace
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/messages">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Message
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/events/create">
                      <Calendar className="mr-2 h-4 w-4" />
                      Create Event
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
