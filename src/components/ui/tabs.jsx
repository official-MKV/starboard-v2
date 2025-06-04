import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext({})

const Tabs = React.forwardRef(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    // Add internal state for uncontrolled usage
    const [tabValue, setTabValue] = React.useState(defaultValue)

    // Use either controlled value or internal state
    const currentValue = value !== undefined ? value : tabValue

    // Handle value change for both controlled and uncontrolled modes
    const handleValueChange = React.useCallback(
      newValue => {
        if (onValueChange) {
          onValueChange(newValue)
        } else {
          setTabValue(newValue)
        }
      },
      [onValueChange]
    )

    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = 'Tabs'

// The rest of your components remain largely the same
const TabsList = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef(
  ({ className, value: triggerValue, children, ...props }, ref) => {
    const { value, onValueChange } = React.useContext(TabsContext)
    const isActive = value === triggerValue

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          isActive ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/80',
          className
        )}
        onClick={() => onValueChange?.(triggerValue)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef(
  ({ className, value: contentValue, children, ...props }, ref) => {
    const { value } = React.useContext(TabsContext)

    if (value !== contentValue) return null

    return (
      <div
        ref={ref}
        className={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }
