'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
} from 'lucide-react'

export function ApplicationStats({ userId, workspaces }) {
  const [stats, setStats] = useState({
    totalApplications: 0,
    activeApplications: 0,
    totalSubmissions: 0,
    pendingReviews: 0,
    acceptanceRate: 0,
    thisWeekSubmissions: 0,
    loading: true,
  })

  useEffect(() => {
    // Simulate API call to fetch stats
    const fetchStats = async () => {
      // In a real app, this would be an API call
      setTimeout(() => {
        setStats({
          totalApplications: 8,
          activeApplications: 3,
          totalSubmissions: 247,
          pendingReviews: 23,
          acceptanceRate: 12.5,
          thisWeekSubmissions: 17,
          loading: false,
        })
      }, 500)
    }

    fetchStats()
  }, [userId, workspaces])

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      change: '+2 this month',
      changeType: 'positive',
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Active Applications',
      value: stats.activeApplications,
      change: 'Currently open',
      changeType: 'neutral',
      icon: Clock,
      color: 'green',
    },
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      change: `+${stats.thisWeekSubmissions} this week`,
      changeType: 'positive',
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      change: 'Need attention',
      changeType: 'warning',
      icon: Eye,
      color: 'orange',
    },
    {
      title: 'Acceptance Rate',
      value: `${stats.acceptanceRate}%`,
      change: '+2.3% vs last cohort',
      changeType: 'positive',
      icon: CheckCircle,
      color: 'emerald',
    },
    {
      title: 'Avg. Review Time',
      value: '3.2 days',
      change: '-0.8 days improvement',
      changeType: 'positive',
      icon: Calendar,
      color: 'indigo',
    },
  ]

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="starboard-card animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-slate-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-slate-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-slate-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon

        return (
          <Card key={index} className="starboard-card hover:shadow-soft-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconBackground(
                    stat.color
                  )}`}
                >
                  <Icon className={`h-4 w-4 ${getIconColor(stat.color)}`} />
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full ${getChangeColor(stat.changeType)}`}
                >
                  {getChangeIcon(stat.changeType)}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold text-charcoal-900">{stat.value}</p>
                <p className="text-xs font-medium text-slate-gray-600">{stat.title}</p>
                <p className={`text-xs ${getChangeTextColor(stat.changeType)}`}>{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function getIconBackground(color) {
  const backgrounds = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    emerald: 'bg-emerald-100',
    indigo: 'bg-indigo-100',
  }
  return backgrounds[color] || 'bg-slate-gray-100'
}

function getIconColor(color) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
  }
  return colors[color] || 'text-slate-gray-600'
}

function getChangeColor(changeType) {
  switch (changeType) {
    case 'positive':
      return 'bg-green-100 text-green-600'
    case 'warning':
      return 'bg-yellow-100 text-yellow-600'
    case 'negative':
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-slate-gray-100 text-slate-gray-600'
  }
}

function getChangeTextColor(changeType) {
  switch (changeType) {
    case 'positive':
      return 'text-green-600'
    case 'warning':
      return 'text-yellow-600'
    case 'negative':
      return 'text-red-600'
    default:
      return 'text-slate-gray-500'
  }
}

function getChangeIcon(changeType) {
  switch (changeType) {
    case 'positive':
      return <TrendingUp className="h-3 w-3" />
    case 'warning':
      return <Clock className="h-3 w-3" />
    case 'negative':
      return <XCircle className="h-3 w-3" />
    default:
      return <TrendingUp className="h-3 w-3" />
  }
}
