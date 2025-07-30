import { useQuery } from '@tanstack/react-query'

export function useDemoDayConfig(eventId) {
  return useQuery({
    queryKey: ['demo-day-config', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/config`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch config')
      }
      return response.json()
    },
  })
}

export function useDemoDaySubmissions(eventId, options = {}) {
  return useQuery({
    queryKey: ['demo-day-submissions', eventId, options],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(options).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const response = await fetch(`/api/demo-days/${eventId}/submissions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch submissions')
      return response.json()
    },
  })
}

export function useDemoDayRankings(eventId, autoRefresh = false) {
  return useQuery({
    queryKey: ['demo-day-rankings', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/rankings`)
      if (!response.ok) throw new Error('Failed to fetch rankings')
      return response.json()
    },
    refetchInterval: autoRefresh ? 30000 : false,
  })
}

export function useDemoDayStats(eventId) {
  return useQuery({
    queryKey: ['demo-day-stats', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    refetchInterval: 30000,
  })
}
