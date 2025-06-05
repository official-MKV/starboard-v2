import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { ResponsiveLayoutWrapper } from '@/components/dashboard/responsive-layout'

export default async function layout({ children }) {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-snow-50">
      <DashboardNav user={user} />
      <ResponsiveLayoutWrapper>{children}</ResponsiveLayoutWrapper>
    </div>
  )
}
