import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, format = 'MMM dd, yyyy') {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  switch (format) {
    case 'MMM dd, yyyy':
      return `${months[d.getMonth()]} ${d
        .getDate()
        .toString()
        .padStart(2, '0')}, ${d.getFullYear()}`
    case 'dd/mm/yyyy':
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${d.getFullYear()}`
    case 'yyyy-mm-dd':
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
        .getDate()
        .toString()
        .padStart(2, '0')}`
    default:
      return d.toLocaleDateString()
  }
}
export function formatRelativeTime(date) {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now - past) / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  // Handle future dates
  if (diffInSeconds < 0) {
    const absDiff = Math.abs(diffInSeconds)
    const absMinutes = Math.floor(absDiff / 60)
    const absHours = Math.floor(absMinutes / 60)
    const absDays = Math.floor(absHours / 24)
    const absWeeks = Math.floor(absDays / 7)
    const absMonths = Math.floor(absDays / 30)
    const absYears = Math.floor(absDays / 365)

    if (absDiff < 60) return 'in a few seconds'
    if (absMinutes < 60) return `in ${absMinutes}m`
    if (absHours < 24) return `in ${absHours}h`
    if (absDays < 7) return `in ${absDays}d`
    if (absWeeks < 4) return `in ${absWeeks}w`
    if (absMonths < 12) return `in ${absMonths}mo`
    return `in ${absYears}y`
  }

  // Handle past dates
  if (diffInSeconds < 60) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`
  if (diffInMonths < 12) return `${diffInMonths}mo ago`
  return `${diffInYears}y ago`
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function debounce(fn, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(fn, delay, ...args)
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
}

export function createQueryString(params) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, value.toString())
    }
  })

  return searchParams.toString()
}

export function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString)
  const result = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}
