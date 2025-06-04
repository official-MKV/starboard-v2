'use client'
import React from 'react'
import { auth } from '@/lib/auth'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardNav } from '@/components/dashboard/nav'
import RoleManagementDashboard from '@/components/users/rolemanagement'
import { useAuth } from '@/lib/hooks/auth'
import UsersManagement from '@/components/users/userManagement'

export default async function userPage() {
  return (
    <div>
      {/* <DashboardNav /> */}
      <UsersManagement />
    </div>
  )
}
