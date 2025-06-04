'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Users, MessageCircle, FolderOpen, Loader2 } from 'lucide-react'
import { PermissionWrapper } from '../permissionWrapper'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/utils/permissions'
import Link from 'next/link'

export function QuickStats({ userId, workspaces }) {
  const { hasPermission } = usePermissions()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [fetchedKeys, setFetchedKeys] = useState({})

  const statsConfig = [
    {
      key: 'applications',
      permission: PERMISSIONS.APPLICATIONS_VIEW,
      endpoint: '/api/applications/statistics',
      title: 'Active Applications',
      icon: FileText,
      defaultValue: '0',
      formatChange: data => data?.change || data?.changeText || 'No change',
      formatValue: data => data?.count || data?.total || data?.active || '0',
    },
    {
      key: 'events',
      permission: PERMISSIONS.EVENTS_VIEW,
      endpoint: '/api/events/statistics',
      title: 'Upcoming Events',
      icon: Calendar,
      defaultValue: '0',
      formatChange: data => data?.nextEvent || data?.next || data?.upcoming || 'No events',
      formatValue: data => data?.count || data?.total || data?.upcoming || '0',
    },
    {
      key: 'users',
      permission: PERMISSIONS.USERS_VIEW,
      endpoint: '/api/users/statistics',
      title: 'Team Members',
      icon: Users,
      defaultValue: workspaces?.[0]?.memberCount || '0',
      formatChange: data => data?.change || data?.changeText || data?.newMembers || 'No change',
      formatValue: data =>
        data?.count || data?.total || data?.members || workspaces?.[0]?.memberCount || '0',
    },
    {
      key: 'messages',
      permission: PERMISSIONS.CHAT_VIEW,
      endpoint: '/api/messages/statistics',
      title: 'Unread Messages',
      icon: MessageCircle,
      defaultValue: '0',
      formatChange: data =>
        data?.urgent || data?.urgentCount
          ? `${data.urgent || data.urgentCount} urgent`
          : 'No urgent',
      formatValue: data => data?.count || data?.unread || data?.total || '0',
    },
    {
      key: 'resources',
      permission: PERMISSIONS.RESOURCES_VIEW,
      endpoint: '/api/resources/statistics',
      title: 'Resources',
      icon: FolderOpen,
      defaultValue: '0',
      formatChange: data => data?.change || data?.changeText || data?.recent || 'No change',
      formatValue: data => data?.count || data?.total || data?.files || '0',
    },
  ]

  const actionCards = [
    {
      key: 'applications-action',
      permission: PERMISSIONS.APPLICATIONS_VIEW,
      title: 'Applications',
      description: 'View and manage accelerator applications',
      icon: FileText,
      href: '/applications',
      buttonText: 'View All',
      statKey: 'applications',
      statLabel: 'Open applications',
    },
    {
      key: 'events-action',
      permission: PERMISSIONS.EVENTS_VIEW,
      title: 'Events',
      description: 'Upcoming workshops and networking events',
      icon: Calendar,
      href: '/events',
      buttonText: 'View All',
      statKey: 'events',
      statLabel: 'This week',
    },
    {
      key: 'resources-action',
      permission: PERMISSIONS.RESOURCES_VIEW,
      title: 'Resources',
      description: 'Access templates, guides, and learning materials',
      icon: FolderOpen,
      href: '/resources',
      buttonText: 'Browse',
      statKey: 'resources',
      statLabel: 'Available resources',
    },
  ]

  const fetchStatistic = async config => {
    const { key, endpoint } = config

    if (!hasPermission(config.permission) || fetchedKeys[key]) {
      return
    }

    try {
      setLoading(prev => ({ ...prev, [key]: true }))
      setErrors(prev => ({ ...prev, [key]: null }))

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${key} statistics`)
      }

      const data = await response.json()
      if (!data || Object.keys(data).length === 0) {
        // Mark as fetched even if no data
        setFetchedKeys(prev => ({ ...prev, [key]: true }))
        return
      }

      setStats(prev => ({ ...prev, [key]: data }))
    } catch (err) {
      console.error(`Error fetching ${key} stats:`, err)
      setErrors(prev => ({ ...prev, [key]: err.message }))
    } finally {
      setFetchedKeys(prev => ({ ...prev, [key]: true }))
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  useEffect(() => {
    statsConfig.forEach(config => {
      fetchStatistic(config)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getChangeType = (data, key) => {
    if (key === 'messages' && (data?.urgent > 0 || data?.urgentCount > 0)) return 'warning'
    if (data?.changeType) return data.changeType
    if (data?.change && data.change.includes('+')) return 'positive'
    if (data?.changeText && data.changeText.includes('+')) return 'positive'
    return 'neutral'
  }

  const visibleStats = statsConfig.filter(config => hasPermission(config.permission))
  const visibleActionCards = actionCards.filter(card => hasPermission(card.permission))

  return (
    <div className="space-y-6">
      {visibleStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {visibleStats.map(config => {
            const Icon = config.icon
            const statData = stats[config.key]
            const isLoading = loading[config.key]
            const error = errors[config.key]

            return (
              <Card key={config.key} className="starboard-card hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-gray-600">
                      {config.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-slate-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-16">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-gray-400" />
                    </div>
                  ) : error ? (
                    <div>
                      <div className="text-2xl font-bold text-red-500">Error</div>
                      <p className="text-xs mt-1 text-red-600">{error}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold text-charcoal-900">
                        {config.formatValue(statData)}
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          getChangeType(statData, config.key) === 'positive'
                            ? 'text-green-600'
                            : getChangeType(statData, config.key) === 'warning'
                              ? 'text-yellow-600'
                              : 'text-slate-gray-500'
                        }`}
                      >
                        {config.formatChange(statData)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {visibleActionCards.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleActionCards.map(card => {
            const Icon = card.icon
            const statData = stats[card.statKey]
            const isLoading = loading[card.statKey]
            const error = errors[card.statKey]

            return (
              <Card
                key={card.key}
                className="starboard-card hover:shadow-soft-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className="h-8 w-8 text-primary" />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={card.href}>{card.buttonText}</Link>
                    </Button>
                  </div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-gray-400" />
                    ) : error ? (
                      <span className="text-2xl font-bold text-red-500">--</span>
                    ) : (
                      <span className="text-2xl font-bold text-charcoal-800">
                        {statsConfig
                          .find(config => config.key === card.statKey)
                          ?.formatValue(statData) || '0'}
                      </span>
                    )}
                    <span className="text-sm text-slate-gray-600">{card.statLabel}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
