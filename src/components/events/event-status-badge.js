'use client'

import { Badge } from '@/components/ui/badge'
import { isAfter, isBefore, isWithinInterval } from 'date-fns'

export function EventStatusBadge({ startDate, endDate, className }) {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  const isUpcoming = isAfter(start, now)
  const isOngoing = isWithinInterval(now, { start, end })
  const isCompleted = isBefore(end, now)

  const getStatus = () => {
    if (isOngoing) return { label: 'Live', color: 'bg-green-500 text-white' }
    if (isUpcoming) return { label: 'Upcoming', color: 'bg-blue-500 text-white' }
    if (isCompleted) return { label: 'Completed', color: 'bg-gray-500 text-white' }
    return { label: 'Draft', color: 'bg-yellow-500 text-white' }
  }

  const status = getStatus()

  return <Badge className={`${status.color} border-0 ${className || ''}`}>{status.label}</Badge>
}
