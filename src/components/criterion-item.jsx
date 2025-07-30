"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import { useDebounce } from "@/lib/hooks/use-debounce"

export function CriterionItem({ criterion, onUpdate, onRemove }) {
  const [label, setLabel] = useState(criterion.label)
  const [description, setDescription] = useState(criterion.description)
  const [weight, setWeight] = useState(criterion.weight)

  const debouncedLabel = useDebounce(label, 300)
  const debouncedDescription = useDebounce(description, 300)
  const debouncedWeight = useDebounce(weight, 300)

  useEffect(() => {
    if (debouncedLabel !== criterion.label) {
      onUpdate(criterion.id, { label: debouncedLabel })
    }
  }, [debouncedLabel, criterion.id, criterion.label, onUpdate])

  useEffect(() => {
    if (debouncedDescription !== criterion.description) {
      onUpdate(criterion.id, { description: debouncedDescription })
    }
  }, [debouncedDescription, criterion.id, criterion.description, onUpdate])

  useEffect(() => {
    if (debouncedWeight !== criterion.weight) {
      onUpdate(criterion.id, { weight: debouncedWeight })
    }
  }, [debouncedWeight, criterion.id, criterion.weight, onUpdate])

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-card text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`label-${criterion.id}`} className="text-sm">
                Criterion Name *
              </Label>
              <Input
                id={`label-${criterion.id}`}
                placeholder="e.g., Innovation"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`weight-${criterion.id}`} className="text-sm">
                  Weight
                </Label>
                <Input
                  id={`weight-${criterion.id}`}
                  type="number"
                  min="0"
                  max="100"
                  value={weight}
                  onChange={(e) => setWeight(Number.parseInt(e.target.value) || 0)}
                />
              </div>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label htmlFor={`description-${criterion.id}`} className="text-sm">
              Description
            </Label>
            <Textarea
              id={`description-${criterion.id}`}
              placeholder="Describe what this criterion evaluates..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(criterion.id)}
          className="shrink-0 mt-1"
        >
          <Trash className="w-4 h-4" />
          <span className="sr-only">Remove criterion</span>
        </Button>
      </div>
    </div>
  )
}
