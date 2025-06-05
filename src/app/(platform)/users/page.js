'use client'
import React from 'react'

import UsersManagement from '@/components/users/userManagement'

export default async function userPage() {
  return (
    <div>
      {/* <DashboardNav /> */}
      <UsersManagement />
    </div>
  )
}
