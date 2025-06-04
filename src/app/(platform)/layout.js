import React from 'react'
import { auth } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function layout({ children }) {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user
  return (
    <div className="min-h-screen">
      <DashboardNav user={user} />
      <div className="pl-64">{children}</div>
    </div>
  )
}
