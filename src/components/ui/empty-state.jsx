import { Calendar, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function EmptyState({
  title = 'No events yet',
  description = "Events are not ready. We're working hard to bring you something amazing!",
  action,
  className,
}) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center text-center p-12">
        {/* Animated icon container */}
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 h-16 w-16" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-xs">
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Sparkles className="h-5 w-5 text-primary mb-1" />
            <span className="text-xs font-medium">Smart Events</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-primary mb-1" />
            <span className="text-xs font-medium">Real-time</span>
          </div>
        </div>

        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}

        <p className="text-xs text-muted-foreground mt-4">Check back soon! ✨</p>
      </CardContent>
    </Card>
  )
}
