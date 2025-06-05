import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { ApplicationsList } from '@/components/applications/applications-list'
import { ApplicationStats } from '@/components/applications/application-stats'
import { Plus, FileText, Users, TrendingUp, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'

export default async function ApplicationsPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-snow-100">
      <DashboardNav user={user} />

      <div className="pl-64">
        <DashboardHeader
          title="Applications"
          description="Manage accelerator applications and review submissions"
          actions={
            <Link href="/applications/create">
              <Button className="starboard-button">
                <Plus className="mr-2 h-4 w-4" />
                Create Application
              </Button>
            </Link>
          }
        />

        <main className="p-6 space-y-6">
          {/* Stats Overview */}
          <ApplicationStats userId={user.id} workspaces={user.workspaces} />

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="starboard-card hover:shadow-soft-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">New</Badge>
                </div>
                <CardTitle>Create Application</CardTitle>
                <CardDescription>
                  Build a new application form with our drag-and-drop builder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/applications/create">
                  <Button className="w-full starboard-button">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="starboard-card hover:shadow-soft-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-primary" />
                  <Badge variant="warning">Pending</Badge>
                </div>
                <CardTitle>Review Submissions</CardTitle>
                <CardDescription>Review and score pending application submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/applications/submissions">
                  <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="starboard-card hover:shadow-soft-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <Badge variant="info">Analytics</Badge>
                </div>
                <CardTitle>View Analytics</CardTitle>
                <CardDescription>
                  Analyze application performance and submission trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/applications/analytics">
                  <Button variant="outline" className="w-full">
                    View Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Card className="starboard-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Applications</CardTitle>
                  <CardDescription>Manage your accelerator application forms</CardDescription>
                </div>
                <Link href="/applications/create">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Application
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ApplicationsList userId={user.id} workspaces={user.workspaces} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="starboard-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest submissions and application updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample recent activity items */}
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-800">New submission received</p>
                    <p className="text-sm text-slate-gray-600">
                      TechFlow AI submitted their accelerator application
                    </p>
                    <p className="text-xs text-slate-gray-400 mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-800">
                      Application deadline approaching
                    </p>
                    <p className="text-sm text-slate-gray-600">
                      Spring 2024 Cohort applications close in 3 days
                    </p>
                    <p className="text-xs text-slate-gray-400 mt-1">5 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-800">Review completed</p>
                    <p className="text-sm text-slate-gray-600">
                      You reviewed GreenFlow Energy's application
                    </p>
                    <p className="text-xs text-slate-gray-400 mt-1">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal-800">Application rejected</p>
                    <p className="text-sm text-slate-gray-600">
                      StartupCorp application was not selected for this cohort
                    </p>
                    <p className="text-xs text-slate-gray-400 mt-1">2 days ago</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200">
                <Link href="/applications/activity">
                  <Button variant="ghost" className="w-full">
                    View All Activity
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
