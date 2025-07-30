import React from 'react'

import UsersManagement from '@/components/users/userManagement'

export const metadata = {
  title: 'Starboard Users',
  description: 'Starboard Users',
  keywords: 'users, roles, invite users, onboarding',
  openGraph: {
    title: 'Events',
    type: 'website',
  },
 
  
}
export default async function userPage() {
  return (
    <div>
      <UsersManagement />
    </div>
  )
}
