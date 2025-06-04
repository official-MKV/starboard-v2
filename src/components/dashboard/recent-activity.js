'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Calendar,
  Users,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderOpen,
  Loader2,
  Shield,
  Building2,
  User,
} from 'lucide-react'

export function RecentActivity({ userId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canViewAll, setCanViewAll] = useState(false)

  const getActivityIcon = type => {
    if (type.startsWith('application_')) return FileText
    if (type.startsWith('calendar_event_')) return Calendar
    if (type.startsWith('message_')) return MessageCircle
    if (type.startsWith('user_')) return Users
    if (type.startsWith('resource_')) return FolderOpen
    if (type.startsWith('workspace_')) return Building2
    if (type.startsWith('role_')) return Shield
    if (type.startsWith('auth_')) return User
    return CheckCircle
  }

  const getActivityColor = type => {
    if (type.includes('submitted') || type.includes('created')) return 'blue'
    if (type.includes('approved') || type.includes('success')) return 'green'
    if (type.includes('rejected') || type.includes('failed') || type.includes('error')) return 'red'
    if (type.includes('message') || type.includes('chat')) return 'purple'
    if (type.includes('user') || type.includes('member')) return 'orange'
    if (type.includes('resource') || type.includes('file')) return 'indigo'
    if (type.includes('workspace')) return 'blue'
    if (type.includes('role')) return 'purple'
    return 'gray'
  }

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/activities/recent?limit=10')

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to fetch recent activities')
        }

        const data = await response.json()

        if (data.success) {
          setActivities(data.data.activities || [])
          setCanViewAll(data.data.canViewAll || false)
        } else {
          throw new Error(data.error?.message || 'Failed to fetch activities')
        }
      } catch (err) {
        console.error('Error fetching activities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  const getTimeAgo = timestamp => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diff = now - activityTime
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      return `${days}d ago`
    }
  }

  const getIconColor = color => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 bg-blue-100'
      case 'green':
        return 'text-green-600 bg-green-100'
      case 'red':
        return 'text-red-600 bg-red-100'
      case 'purple':
        return 'text-purple-600 bg-purple-100'
      case 'orange':
        return 'text-orange-600 bg-orange-100'
      case 'indigo':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-slate-gray-600 bg-slate-gray-100'
    }
  }

  // Show loading state
  if (loading) {
    return (
      <Card className="starboard-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="starboard-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
            <p className="text-red-600">Failed to load activities</p>
            <p className="text-sm text-red-400 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="starboard-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          {activities.length > 0 && (
            <Button variant="ghost" size="sm">
              View All
            </Button>
          )}
        </div>
        {canViewAll && (
          <p className="text-xs text-slate-gray-500 mt-1">Showing workspace activities</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map(activity => {
            const Icon = getActivityIcon(activity.type)
            const color = getActivityColor(activity.type)

            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(color)}`}
                >
                  <Icon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-800">{activity.title}</p>
                  <p className="text-sm text-slate-gray-600 mt-1">{activity.description}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-gray-400">{getTimeAgo(activity.timestamp)}</p>
                    {activity.user && activity.user.id !== userId && (
                      <p className="text-xs text-slate-gray-500">
                        by {activity.user.firstName} {activity.user.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {activities.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-slate-gray-300 mx-auto mb-3" />
              <p className="text-slate-gray-600">No recent activity</p>
              <p className="text-sm text-slate-gray-400 mt-1">
                Your activity will appear here as you use Starboard
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
