"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Loader2 } from "lucide-react"

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"]

export function DashboardCharts({ userId, workspaces }) {
  const [chartData, setChartData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const [applicationsRes, usersRes, eventsRes] = await Promise.all([
          fetch("/api/applications/statistics"),
          fetch("/api/users/statistics"),
          fetch("/api/events/statistics"),
        ])

        const applications = applicationsRes.ok ? await applicationsRes.json() : null
        const users = usersRes.ok ? await usersRes.json() : null
        const events = eventsRes.ok ? await eventsRes.json() : null

        // Application status data from real API
        const statusData = [
          {
            name: "Pending",
            value: applications?.pendingReviews || applications?.data?.pendingReviews || 0,
            color: "#F59E0B",
          },
          {
            name: "Accepted",
            value: Math.floor(
              ((applications?.totalSubmissions || applications?.data?.totalSubmissions || 0) *
                (applications?.acceptanceRate || 60)) /
                100,
            ),
            color: "#10B981",
          },
          {
            name: "Rejected",
            value:
              (applications?.totalSubmissions || applications?.data?.totalSubmissions || 0) -
              Math.floor(
                ((applications?.totalSubmissions || applications?.data?.totalSubmissions || 0) *
                  (applications?.acceptanceRate || 60)) /
                  100,
              ) -
              (applications?.pendingReviews || applications?.data?.pendingReviews || 0),
            color: "#EF4444",
          },
        ]

        // Role distribution from users API
        const roleDistribution = users?.data?.statistics?.usersByRole || []

        // Create time series from available data
        const currentMonth = new Date().toLocaleString("default", { month: "short" })
        const timeSeriesData = [
          {
            month: currentMonth,
            applications: applications?.thisWeekSubmissions || applications?.data?.thisWeekSubmissions || 0,
            users: users?.data?.statistics?.recentJoins || 0,
            events: events?.data?.upcomingEvents || events?.upcoming || 0,
          },
        ]

        setChartData({
          timeSeries: timeSeriesData,
          applicationStatus: statusData.filter((item) => item.value > 0),
          roleDistribution,
          applications: applications?.data || applications,
          users: users?.data?.statistics || users,
          events: events?.data || events,
        })
      } catch (error) {
        console.error("Error fetching chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.applicationStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartData.applicationStatus?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {chartData.applications?.totalApplications || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Applications</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {chartData.applications?.activeApplications || 0}
                    </div>
                    <div className="text-sm text-gray-600">Active Applications</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{chartData.users?.totalUsers || 0}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {chartData.applications?.acceptanceRate || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Acceptance Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Submissions</span>
                    <span className="font-semibold">{chartData.applications?.totalSubmissions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Reviews</span>
                    <span className="font-semibold text-yellow-600">{chartData.applications?.pendingReviews || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Week Submissions</span>
                    <span className="font-semibold text-blue-600">
                      {chartData.applications?.thisWeekSubmissions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Review Time</span>
                    <span className="font-semibold">{chartData.applications?.avgReviewTime || 0} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.applicationStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Users</span>
                    <span className="font-semibold">{chartData.users?.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <span className="font-semibold text-green-600">{chartData.users?.activeUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Recent Joins</span>
                    <span className="font-semibold text-blue-600">{chartData.users?.recentJoins || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Verification Rate</span>
                    <span className="font-semibold">{chartData.users?.verificationRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.roleDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.roleDistribution} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="roleName" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="userCount" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">No role data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Growth Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{chartData.users?.growthRate || 0}%</div>
                  <div className="text-sm text-gray-600">User Growth Rate</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-2">{chartData.users?.activityRate || 0}%</div>
                  <div className="text-sm text-gray-600">Activity Rate</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{chartData.users?.loginActivity || 0}</div>
                  <div className="text-sm text-gray-600">Weekly Active Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
