'use client'

import React, { useState, useEffect } from 'react'

export function ResponsiveLayoutWrapper({ children }) {
  const [sidebarState, setSidebarState] = useState({
    isCollapsed: false,
    isMobile: false,
  })

  // Handle screen size detection and sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 1024
      setSidebarState(prev => ({
        ...prev,
        isMobile,
      }))
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleSidebarToggle = event => {
      setSidebarState(prev => ({
        ...prev,
        isCollapsed: event.detail.isCollapsed,
      }))
    }

    window.addEventListener('sidebarToggle', handleSidebarToggle)
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle)
  }, [])

  // Get the appropriate padding based on sidebar state
  const getMainContentClasses = () => {
    if (sidebarState.isMobile) {
      return 'pt-16' // Only top padding for mobile menu button
    }
    return sidebarState.isCollapsed ? 'pl-20' : 'pl-72'
  }

  return (
    <main className={`transition-all duration-300 min-h-screen ${getMainContentClasses()}`}>
      <div className="p-4 lg:p-6">{children}</div>
    </main>
  )
}
