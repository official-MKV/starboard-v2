"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ExternalLink, Settings, Plus, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { PERMISSIONS } from "@/lib/utils/permissions"
import Link from "next/link"

export function LiveApplications({ userId }) {
  const { hasPermission } = usePermissions()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApplications = async () => {
      if (!hasPermission(PERMISSIONS.APPLICATIONS_VIEW)) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/applications/statistics")
        if (response.ok) {
          const data = await response.json()
          setApplications(data?.data?.liveApplications || [])
        }
      } catch (error) {
        console.error("Error fetching applications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [hasPermission])

  if (!hasPermission(PERMISSIONS.APPLICATIONS_VIEW)) {
    return null
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Live Applications</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="starboard-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Live Applications</h2>
        {hasPermission(PERMISSIONS.APPLICATIONS_CREATE) && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Application
          </Button>
        )}
      </div>

      {applications.length === 0 ? (
        <Card className="starboard-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active applications</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first application.</p>
            {hasPermission(PERMISSIONS.APPLICATIONS_CREATE) && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Application
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {applications.map((application) => {
            const isOpen = application.isOpen
            const daysRemaining = application.daysRemaining
            const progressPercentage = daysRemaining > 0 ? Math.max(0, ((30 - daysRemaining) / 30) * 100) : 100

            return (
              <Card key={application.id} className="starboard-card hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{application.title}</CardTitle>
                    <Badge
                      variant={isOpen ? "default" : "secondary"}
                      className={isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {isOpen ? `${daysRemaining} days remaining` : "Application closed"}
                  </div>
                  {isOpen && daysRemaining > 0 && (
                    <div className="mt-2">
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-bold text-gray-900">{application.submissionCount}</span>
                        {application.submissionTrend > 0 && (
                          <div className="flex items-center text-green-600">
                            <ArrowUp className="w-4 h-4" />
                            <span className="text-sm">+{application.submissionTrend}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Submissions</p>
                    </div>

                    <div>
                      <span className="text-2xl font-bold text-gray-900">{application.pendingReviews}</span>
                      <p className="text-sm text-gray-600">Pending Reviews</p>
                    </div>

                    <div>
                      <span className="text-2xl font-bold text-gray-900">{application.acceptanceRate}%</span>
                      <p className="text-sm text-gray-600">Acceptance Rate</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Link href={`/applications/${application.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Applications
                      </Link>
                    </Button>
                    {hasPermission(PERMISSIONS.APPLICATIONS_MANAGE) && (
                      <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Link href={`/applications/${application.id}/settings`}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Link>
                      </Button>
                    )}
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
