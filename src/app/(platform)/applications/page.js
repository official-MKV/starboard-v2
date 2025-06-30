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
import { PermissionWrapper } from '@/components/permissionWrapper'
import { Plus, FileText, Users, TrendingUp, Eye } from 'lucide-react'
import { PERMISSIONS } from '@/lib/utils/permissions'

export default async function ApplicationsPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="">
        <DashboardHeader
          title="Applications"
          description="Manage accelerator applications and review submissions"
          actions={
            <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_CREATE} fallback={null}>
              <Link href="/applications/create">
                <Button className="starboard-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Application
                </Button>
              </Link>
            </PermissionWrapper>
          }
        />

        <main className="p-6 space-y-6">
          {/* Stats Overview */}
          <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_VIEW} fallback={null}>
            <ApplicationStats userId={user.id} workspaces={user.workspaces} />
          </PermissionWrapper>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_CREATE} fallback={null}>
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
            </PermissionWrapper>

            <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_REVIEW} fallback={null}>
              <Card className="starboard-card hover:shadow-soft-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-primary" />
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <CardTitle>Review Submissions</CardTitle>
                  <CardDescription>
                    Review and score pending application submissions
                  </CardDescription>
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
            </PermissionWrapper>

            <PermissionWrapper permission={PERMISSIONS.ANALYTICS_VIEW} fallback={null}>
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
            </PermissionWrapper>
          </div>

          {/* Applications List */}
          <PermissionWrapper
            permission={PERMISSIONS.APPLICATIONS_VIEW}
            fallback={
              <Card className="starboard-card">
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-slate-gray-600">
                    You don't have permission to view applications.
                  </p>
                </CardContent>
              </Card>
            }
          >
            <Card className="starboard-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Applications</CardTitle>
                    <CardDescription>Manage your accelerator application forms</CardDescription>
                  </div>
                  <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_CREATE} fallback={null}>
                    <Link href="/applications/create">
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Application
                      </Button>
                    </Link>
                  </PermissionWrapper>
                </div>
              </CardHeader>
              <CardContent>
                <ApplicationsList userId={user.id} workspaces={user.workspaces} />
              </CardContent>
            </Card>
          </PermissionWrapper>
        </main>
      </div>
    </div>
  )
}
