"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, Users, MessageCircle, FolderOpen, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { PERMISSIONS } from "@/lib/utils/permissions"

export function QuickStats({ userId, workspaces }) {
  const { hasPermission } = usePermissions()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState({})

  const statsConfig = [
    {
      key: "applications",
      permission: PERMISSIONS.APPLICATIONS_VIEW,
      endpoint: "/api/applications/statistics",
      title: "Applications",
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      key: "events",
      permission: PERMISSIONS.EVENTS_VIEW,
      endpoint: "/api/events/statistics",
      title: "Events",
      icon: Calendar,
      color: "bg-green-500",
    },
    {
      key: "users",
      permission: PERMISSIONS.USERS_VIEW,
      endpoint: "/api/users/statistics",
      title: "Team Members",
      icon: Users,
      color: "bg-purple-500",
    },
    {
      key: "messages",
      permission: PERMISSIONS.CHAT_VIEW,
      endpoint: "/api/messages/statistics",
      title: "Messages",
      icon: MessageCircle,
      color: "bg-orange-500",
    },
    {
      key: "resources",
      permission: PERMISSIONS.RESOURCES_VIEW,
      endpoint: "/api/resources/statistics",
      title: "Resources",
      icon: FolderOpen,
      color: "bg-indigo-500",
    },
  ]

  const fetchStats = async () => {
    const promises = statsConfig
      .filter((config) => hasPermission(config.permission))
      .map(async (config) => {
        setLoading((prev) => ({ ...prev, [config.key]: true }))
        try {
          const response = await fetch(config.endpoint)
          if (response.ok) {
            const data = await response.json()
            return { key: config.key, data }
          }
        } catch (error) {
          console.error(`Error fetching ${config.key}:`, error)
        } finally {
          setLoading((prev) => ({ ...prev, [config.key]: false }))
        }
        return { key: config.key, data: null }
      })

    const results = await Promise.all(promises)
    const newStats = {}
    results.forEach(({ key, data }) => {
      newStats[key] = data
    })
    setStats(newStats)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  console.log(stats)

  const visibleStats = statsConfig.filter((config) => hasPermission(config.permission))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {visibleStats.map((config) => {
        const Icon = config.icon
        const statData = stats[config.key]
        const isLoading = loading[config.key]

        const value =
          statData?.data?.totalApplications ||
          statData?.totalApplications ||
          statData?.data?.statistics?.totalUsers ||
          statData?.totalUsers ||
          statData?.data?.count ||
          statData?.count ||
          statData?.total ||
          "0"

        const change =
          statData?.data?.thisWeekSubmissions ||
          statData?.thisWeekSubmissions ||
          statData?.data?.statistics?.recentJoins ||
          statData?.recentJoins ||
          statData?.data?.change ||
          statData?.change ||
          0

        const changePercent = statData?.data?.statistics?.growthRate || statData?.growthRate || 0

        return (
          <Card
            key={config.key}
            className="relative overflow-hidden hover:shadow-lg transition-all duration-200 starboard-card"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {changePercent !== 0 && (
                  <div className={`flex items-center text-sm ${changePercent > 0 ? "text-green-600" : "text-red-600"}`}>
                    {changePercent > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="ml-1">{Math.abs(changePercent)}%</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
                  <CardTitle className="text-sm font-medium text-gray-600 mb-2">{config.title}</CardTitle>
                  {change > 0 && <p className="text-xs text-gray-500">+{change} this week</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
