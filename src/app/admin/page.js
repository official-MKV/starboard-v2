import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminNavSidebar } from '@/components/admin/admin-nav'
import {
  Users,
  Building2,
  FileText,
  Activity,
  AlertTriangle,
  TrendingUp,
  Database,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'

// This would fetch real data from your APIs
async function getSystemStats() {
  // Mock data - replace with actual API calls
  return {
    users: {
      total: 247,
      active: 189,
      newThisWeek: 12,
    },
    workspaces: {
      total: 23,
      active: 18,
    },
    applications: {
      total: 45,
      active: 12,
      submissions: 1247,
    },
    system: {
      uptime: '99.9%',
      errors: 3,
      warnings: 12,
      lastDeployment: new Date('2024-01-20T10:30:00Z'),
    },
  }
}

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const isAdmin =
    session.user.email === 'admin@starboard.com' ||
    session.user.workspaces?.some(ws => ws.role === 'admin')

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const stats = await getSystemStats()

  return (
    <div className="min-h-screen bg-snow-100">
      <AdminNavSidebar user={session.user} />

      <div className="pl-64">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-charcoal-900">Admin Dashboard</h1>
              <p className="text-slate-gray-600">System overview and management</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success" className="flex items-center">
                <CheckCircle className="mr-1 h-3 w-3" />
                System Healthy
              </Badge>
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </div>
          </div>
        </div>

        <main className="p-6 space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">{stats.users.total}</p>
                    <p className="text-sm text-slate-gray-600">Total Users</p>
                    <p className="text-xs text-green-600 mt-1">
                      +{stats.users.newThisWeek} this week
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">{stats.workspaces.total}</p>
                    <p className="text-sm text-slate-gray-600">Workspaces</p>
                    <p className="text-xs text-slate-gray-500 mt-1">
                      {stats.workspaces.active} active
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">
                      {stats.applications.submissions}
                    </p>
                    <p className="text-sm text-slate-gray-600">Total Submissions</p>
                    <p className="text-xs text-slate-gray-500 mt-1">
                      {stats.applications.total} applications
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">{stats.system.uptime}</p>
                    <p className="text-sm text-slate-gray-600">Uptime</p>
                    <p className="text-xs text-green-600 mt-1">Last 30 days</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Health */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status and recent alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">All Systems Operational</p>
                        <p className="text-sm text-green-600">No critical issues detected</p>
                      </div>
                    </div>
                    <Badge variant="success">Healthy</Badge>
                  </div>

                  {stats.system.errors > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">
                            {stats.system.errors} Recent Errors
                          </p>
                          <p className="text-sm text-red-600">Requires attention</p>
                        </div>
                      </div>
                      <Link href="/admin/logs?level=error">
                        <Button variant="outline" size="sm">
                          View Errors
                        </Button>
                      </Link>
                    </div>
                  )}

                  {stats.system.warnings > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">
                            {stats.system.warnings} Warnings
                          </p>
                          <p className="text-sm text-yellow-600">Review recommended</p>
                        </div>
                      </div>
                      <Link href="/admin/logs?level=warn">
                        <Button variant="outline" size="sm">
                          View Warnings
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Recent System Activity</CardTitle>
                  <CardDescription>Latest system events and administrative actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal-800">
                          New user registration
                        </p>
                        <p className="text-sm text-slate-gray-600">
                          sarah@techstartup.com joined TechHub Accelerator
                        </p>
                        <p className="text-xs text-slate-gray-400 mt-1">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal-800">Application created</p>
                        <p className="text-sm text-slate-gray-600">
                          Summer 2024 Cohort application form published
                        </p>
                        <p className="text-xs text-slate-gray-400 mt-1">5 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal-800">System warning</p>
                        <p className="text-sm text-slate-gray-600">
                          High API request volume detected
                        </p>
                        <p className="text-xs text-slate-gray-400 mt-1">1 day ago</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <Link href="/admin/logs">
                      <Button variant="ghost" className="w-full">
                        View All Activity
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/logs">
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="mr-2 h-4 w-4" />
                      View System Logs
                    </Button>
                  </Link>

                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>

                  <Link href="/admin/workspaces">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="mr-2 h-4 w-4" />
                      Manage Workspaces
                    </Button>
                  </Link>

                  <Link href="/admin/database">
                    <Button variant="outline" className="w-full justify-start">
                      <Database className="mr-2 h-4 w-4" />
                      Database Status
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>System Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray-600">Version</span>
                    <span className="text-sm font-medium">v1.0.0</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray-600">Environment</span>
                    <Badge variant="info" className="text-xs">
                      Development
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray-600">Last Deployment</span>
                    <span className="text-sm font-medium">
                      {new Date(stats.system.lastDeployment).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-gray-600">Database</span>
                    <Badge variant="success" className="text-xs">
                      Connected
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
