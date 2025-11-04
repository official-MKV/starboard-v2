'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  FileText,
  List,
  CheckSquare,
  Upload,
  Star,
  MousePointer,
  Layers,
} from 'lucide-react'

const FIELD_TYPES = [
  {
    value: 'TEXT',
    label: 'Short Text',
    icon: Type,
    description: 'Single line text input',
    category: 'Basic',
  },
  {
    value: 'TEXTAREA',
    label: 'Long Text',
    icon: FileText,
    description: 'Multi-line text area',
    category: 'Basic',
  },
  {
    value: 'EMAIL',
    label: 'Email',
    icon: Mail,
    description: 'Email address with validation',
    category: 'Basic',
  },
  {
    value: 'PHONE',
    label: 'Phone',
    icon: Phone,
    description: 'Phone number input',
    category: 'Basic',
  },
  { value: 'NUMBER', label: 'Number', icon: Hash, description: 'Numeric input', category: 'Basic' },
  { value: 'DATE', label: 'Date', icon: Calendar, description: 'Date picker', category: 'Basic' },
  {
    value: 'SELECT',
    label: 'Dropdown',
    icon: List,
    description: 'Single selection dropdown',
    category: 'Choice',
  },
  {
    value: 'RADIO',
    label: 'Radio Buttons',
    icon: CheckSquare,
    description: 'Single choice from options',
    category: 'Choice',
  },
  {
    value: 'CHECKBOX',
    label: 'Checkboxes',
    icon: CheckSquare,
    description: 'Multiple selections',
    category: 'Choice',
  },
  {
    value: 'BOOLEAN',
    label: 'Yes/No',
    icon: CheckSquare,
    description: 'Single checkbox',
    category: 'Choice',
  },
  {
    value: 'FILE_UPLOAD',
    label: 'File Upload',
    icon: Upload,
    description: 'Single file upload',
    category: 'Advanced',
  },
  {
    value: 'MULTI_FILE',
    label: 'Multiple Files',
    icon: Upload,
    description: 'Multiple file uploads',
    category: 'Advanced',
  },
  {
    value: 'RATING',
    label: 'Rating',
    icon: Star,
    description: 'Star rating or numeric rating',
    category: 'Advanced',
  },
  {
    value: 'URL',
    label: 'Website URL',
    icon: Type,
    description: 'URL with validation',
    category: 'Advanced',
  },
  {
    value: 'SECTION_HEADER',
    label: 'Section Header',
    icon: Layers,
    description: 'Section divider',
    category: 'Layout',
  },
]

const FIELD_CATEGORIES = ['Basic', 'Choice', 'Advanced', 'Layout']

// Helper function to normalize field options from JSON to array
const getFieldOptions = (field) => {
  if (!field.options) return []

  // If it's already an array, return it
  if (Array.isArray(field.options)) return field.options

  // If it's a string, try to parse it
  if (typeof field.options === 'string') {
    try {
      const parsed = JSON.parse(field.options)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  // If it's an object (Prisma JsonValue), try to convert
  if (typeof field.options === 'object') {
    // Check if it's an object with numeric keys (array-like)
    const keys = Object.keys(field.options)
    if (keys.every(k => !isNaN(k))) {
      return Object.values(field.options)
    }
  }

  return []
}

// Helper function to normalize allowed file types
const getAllowedFileTypes = (field) => {
  if (!field.allowedFileTypes) return []

  // If it's already an array, return it
  if (Array.isArray(field.allowedFileTypes)) return field.allowedFileTypes

  // If it's a string, try to parse it
  if (typeof field.allowedFileTypes === 'string') {
    try {
      const parsed = JSON.parse(field.allowedFileTypes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  // If it's an object, try to convert
  if (typeof field.allowedFileTypes === 'object') {
    const keys = Object.keys(field.allowedFileTypes)
    if (keys.every(k => !isNaN(k))) {
      return Object.values(field.allowedFileTypes)
    }
  }

  return []
}

export function FormBuilder({ initialFields = [], onFieldsChange, isPreview = false }) {
  const [fields, setFields] = useState(initialFields)
  const [selectedField, setSelectedField] = useState(null)
  const [showFieldTypes, setShowFieldTypes] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Basic')

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(
    result => {
      if (!result.destination) return

      const items = Array.from(fields)
      const [reorderedItem] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, reorderedItem)

      // Update order values
      const updatedFields = items.map((field, index) => ({
        ...field,
        order: index,
      }))

      setFields(updatedFields)
      onFieldsChange?.(updatedFields)
    },
    [fields, onFieldsChange]
  )

  // Add new field
  const addField = useCallback(
    fieldType => {
      const newField = {
        id: `field_${Date.now()}`,
        type: fieldType.value,
        label: fieldType.label,
        description: '',
        placeholder: '',
        required: false,
        order: fields.length,
        section: '',
        isVisible: true,
        isConditional: false,
        // Type-specific defaults
        ...(fieldType.value === 'SELECT' ||
        fieldType.value === 'RADIO' ||
        fieldType.value === 'CHECKBOX'
          ? { options: [{ value: 'option1', label: 'Option 1' }] }
          : {}),
        ...(fieldType.value === 'FILE_UPLOAD' || fieldType.value === 'MULTI_FILE'
          ? {
              allowedFileTypes: ['pdf', 'doc', 'docx'],
              maxFileSize: 10,
              maxFiles: fieldType.value === 'MULTI_FILE' ? 5 : 1,
            }
          : {}),
        ...(fieldType.value === 'TEXT' || fieldType.value === 'TEXTAREA'
          ? { maxLength: fieldType.value === 'TEXT' ? 255 : 2000 }
          : {}),
        ...(fieldType.value === 'RATING' ? { minValue: 1, maxValue: 5 } : {}),
      }

      const updatedFields = [...fields, newField]
      setFields(updatedFields)
      onFieldsChange?.(updatedFields)
      setSelectedField(newField)
      setShowFieldTypes(false)
    },
    [fields, onFieldsChange]
  )

  // Update field
  const updateField = useCallback(
    (fieldId, updates) => {
      const updatedFields = fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
      setFields(updatedFields)
      onFieldsChange?.(updatedFields)
      if (selectedField?.id === fieldId) {
        setSelectedField({ ...selectedField, ...updates })
      }
    },
    [fields, selectedField, onFieldsChange]
  )

  // Delete field
  const deleteField = useCallback(
    fieldId => {
      const updatedFields = fields.filter(field => field.id !== fieldId)
      setFields(updatedFields)
      onFieldsChange?.(updatedFields)
      if (selectedField?.id === fieldId) {
        setSelectedField(null)
      }
    },
    [fields, selectedField, onFieldsChange]
  )

  // Duplicate field
  const duplicateField = useCallback(
    field => {
      const duplicatedField = {
        ...field,
        id: `field_${Date.now()}`,
        label: `${field.label} (Copy)`,
        order: fields.length,
      }
      const updatedFields = [...fields, duplicatedField]
      setFields(updatedFields)
      onFieldsChange?.(updatedFields)
    },
    [fields, onFieldsChange]
  )

  if (isPreview) {
    return <FormPreview fields={fields} />
  }

  const categorizedFields = FIELD_CATEGORIES.reduce((acc, category) => {
    acc[category] = FIELD_TYPES.filter(field => field.category === category)
    return acc
  }, {})

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop fields to build your form
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="px-3 py-1">
                  {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                </Badge>
                <Sheet open={showFieldTypes} onOpenChange={setShowFieldTypes}>
                  <SheetTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Add Field</SheetTitle>
                      <SheetDescription>Choose a field type to add to your form</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      {/* Category Tabs */}
                      <div className="flex space-x-1 mb-4">
                        {FIELD_CATEGORIES.map(category => (
                          <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              activeCategory === category
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>

                      {/* Field Types */}
                      <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="space-y-2">
                          {categorizedFields[activeCategory]?.map(fieldType => {
                            const Icon = fieldType.icon
                            return (
                              <button
                                key={fieldType.value}
                                onClick={() => addField(fieldType)}
                                className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all group"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-gray-100 rounded-md group-hover:bg-blue-100 transition-colors">
                                    <Icon className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 group-hover:text-blue-700">
                                      {fieldType.label}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {fieldType.description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Form Builder Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {fields.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MousePointer className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Start building your form
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Add fields by clicking the "Add Field" button above. You can drag and drop to
                    reorder them.
                  </p>
                  <Button onClick={() => setShowFieldTypes(true)} size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">Form Preview</CardTitle>
                      <div className="text-sm text-gray-500">
                        Drag fields to reorder • Click to edit
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="form-fields">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`space-y-4 min-h-[200px] ${
                              snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
                            }`}
                          >
                            {fields.map((field, index) => (
                              <Draggable key={field.id} draggableId={field.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`group relative ${snapshot.isDragging ? 'z-50' : ''}`}
                                  >
                                    <div
                                      className={`p-4 border-2 rounded-lg bg-white transition-all ${
                                        selectedField?.id === field.id
                                          ? 'border-blue-500 shadow-md'
                                          : 'border-gray-200 hover:border-gray-300'
                                      } ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-sm'}`}
                                      onClick={() => setSelectedField(field)}
                                    >
                                      {/* Field Header */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                          >
                                            <GripVertical className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <div className="flex items-center space-x-2">
                                              <h4 className="font-medium text-gray-900">
                                                {field.label}
                                              </h4>
                                              <Badge variant="outline" className="text-xs">
                                                {field.type}
                                              </Badge>
                                              {field.required && (
                                                <Badge variant="destructive" className="text-xs">
                                                  Required
                                                </Badge>
                                              )}
                                            </div>
                                            {field.description && (
                                              <p className="text-sm text-gray-500 mt-1">
                                                {field.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Field Actions */}
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  updateField(field.id, {
                                                    isVisible: !field.isVisible,
                                                  })
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                                              >
                                                {field.isVisible ? (
                                                  <Eye className="h-4 w-4" />
                                                ) : (
                                                  <EyeOff className="h-4 w-4" />
                                                )}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {field.isVisible ? 'Hide field' : 'Show field'}
                                            </TooltipContent>
                                          </Tooltip>

                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  duplicateField(field)
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                                              >
                                                <Copy className="h-4 w-4" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Duplicate field</TooltipContent>
                                          </Tooltip>

                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  deleteField(field.id)
                                                }}
                                                className="p-1.5 text-red-400 hover:text-red-600 rounded"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete field</TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>

                                      {/* Field Preview */}
                                      <div className={field.isVisible ? '' : 'opacity-50'}>
                                        <FieldPreview field={field} />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        {selectedField && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-scroll">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Field Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedField(null)}>
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Configure the selected field</p>
            </div>
            <ScrollArea className="flex-1 p-6">
              <FieldSettings
                field={selectedField}
                onUpdate={updates => updateField(selectedField.id, updates)}
              />
            </ScrollArea>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Enhanced Field Preview Component
function FieldPreview({ field }) {
  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  switch (field.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'PHONE':
    case 'URL':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <input
            type="text"
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={baseClasses}
            disabled
          />
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'TEXTAREA':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <textarea
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={3}
            className={baseClasses}
            disabled
          />
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'NUMBER':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <input
            type="number"
            placeholder={field.placeholder || '0'}
            className={baseClasses}
            disabled
          />
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'DATE':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <input type="date" className={baseClasses} disabled />
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'SELECT':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <select className={baseClasses} disabled>
            <option>Select an option...</option>
            {getFieldOptions(field).map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'RADIO':
      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {getFieldOptions(field).map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name={field.id} disabled className="text-blue-600" />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'CHECKBOX':
      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {getFieldOptions(field).map((option, index) => (
              <label key={index} className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" disabled className="text-blue-600 rounded" />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'BOOLEAN':
      return (
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" disabled className="text-blue-600 rounded" />
            <span className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
          {field.description && <p className="text-xs text-gray-500 ml-6">{field.description}</p>}
        </div>
      )

    case 'FILE_UPLOAD':
    case 'MULTI_FILE':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Drop files here or click to upload</p>
            <p className="text-xs text-gray-500">
              {field.type === 'MULTI_FILE' ? `Up to ${field.maxFiles || 5} files` : 'Single file'}
              {field.maxFileSize && ` • Max ${field.maxFileSize}MB`}
            </p>
          </div>
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'RATING':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="flex items-center space-x-1">
            {Array.from({ length: field.maxValue || 5 }).map((_, index) => (
              <Star
                key={index}
                className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer transition-colors"
              />
            ))}
          </div>
          {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
        </div>
      )

    case 'SECTION_HEADER':
      return (
        <div className="py-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-xl font-semibold text-gray-900">{field.label}</h3>
            {field.description && <p className="text-sm text-gray-600 mt-2">{field.description}</p>}
          </div>
        </div>
      )

    default:
      return (
        <div className="p-6 bg-gray-50 rounded-lg text-center border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-500">Field preview not available</p>
        </div>
      )
  }
}

// Enhanced Field Settings Component
function FieldSettings({ field, onUpdate }) {
  const handleOptionChange = (index, key, value) => {
    const updatedOptions = [...getFieldOptions(field)]
    updatedOptions[index] = { ...updatedOptions[index], [key]: value }
    onUpdate({ options: updatedOptions })
  }

  const addOption = () => {
    const options = getFieldOptions(field)
    onUpdate({
      options: [
        ...options,
        { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` },
      ],
    })
  }

  const removeOption = index => {
    const updatedOptions = getFieldOptions(field).filter((_, i) => i !== index)
    onUpdate({ options: updatedOptions })
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          Basic Settings
        </h4>

        <div className="space-y-3">
          <div>
            <Label htmlFor="label" className="text-sm font-medium">
              Field Label *
            </Label>
            <Input
              id="label"
              value={field.label}
              onChange={e => onUpdate({ label: e.target.value })}
              className="mt-1"
              placeholder="Enter field label"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={field.description || ''}
              onChange={e => onUpdate({ description: e.target.value })}
              className="mt-1"
              rows={2}
              placeholder="Optional help text for users"
            />
          </div>

          <div>
            <Label htmlFor="placeholder" className="text-sm font-medium">
              Placeholder Text
            </Label>
            <Input
              id="placeholder"
              value={field.placeholder || ''}
              onChange={e => onUpdate({ placeholder: e.target.value })}
              className="mt-1"
              placeholder="Placeholder text..."
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Validation Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Validation</h4>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Required Field</Label>
            <p className="text-xs text-gray-500">Users must fill this field</p>
          </div>
          <Switch
            checked={field.required}
            onCheckedChange={checked => onUpdate({ required: checked })}
          />
        </div>

        {/* Type-specific validation */}
        {(field.type === 'TEXT' || field.type === 'TEXTAREA') && (
          <div>
            <Label htmlFor="maxLength" className="text-sm font-medium">
              Maximum Length
            </Label>
            <Input
              id="maxLength"
              type="number"
              value={field.maxLength || ''}
              onChange={e => onUpdate({ maxLength: Number.parseInt(e.target.value) || null })}
              className="mt-1"
              placeholder="No limit"
            />
          </div>
        )}

        {field.type === 'NUMBER' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="minValue" className="text-sm font-medium">
                Min Value
              </Label>
              <Input
                id="minValue"
                type="number"
                value={field.minValue || ''}
                onChange={e => onUpdate({ minValue: Number.parseFloat(e.target.value) || null })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxValue" className="text-sm font-medium">
                Max Value
              </Label>
              <Input
                id="maxValue"
                type="number"
                value={field.maxValue || ''}
                onChange={e => onUpdate({ maxValue: Number.parseFloat(e.target.value) || null })}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Options for choice fields */}
      {(field.type === 'SELECT' || field.type === 'RADIO' || field.type === 'CHECKBOX') && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Options</h4>
            <div className="space-y-3">
              {getFieldOptions(field).map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option.label}
                    onChange={e => handleOptionChange(index, 'label', e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => removeOption(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={addOption}
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          </div>
        </>
      )}

      {/* File upload settings */}
      {(field.type === 'FILE_UPLOAD' || field.type === 'MULTI_FILE') && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">File Settings</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="maxFileSize" className="text-sm font-medium">
                  Max File Size (MB)
                </Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={field.maxFileSize || ''}
                  onChange={e => onUpdate({ maxFileSize: Number.parseInt(e.target.value) || null })}
                  className="mt-1"
                  placeholder="10"
                />
              </div>
              {field.type === 'MULTI_FILE' && (
                <div>
                  <Label htmlFor="maxFiles" className="text-sm font-medium">
                    Max Number of Files
                  </Label>
                  <Input
                    id="maxFiles"
                    type="number"
                    value={field.maxFiles || ''}
                    onChange={e => onUpdate({ maxFiles: Number.parseInt(e.target.value) || null })}
                    className="mt-1"
                    placeholder="5"
                  />
                </div>
              )}

              {/* Allowed File Types */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Allowed File Types</Label>

                {/* Quick Select Groups */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Quick Select:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['*'] })
                      }}
                    >
                      All Files
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'] })
                      }}
                    >
                      Documents
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] })
                      }}
                    >
                      Images
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'] })
                      }}
                    >
                      Videos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] })
                      }}
                    >
                      Audio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['xls', 'xlsx', 'csv', 'ods'] })
                      }}
                    >
                      Spreadsheets
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['ppt', 'pptx', 'odp'] })
                      }}
                    >
                      Presentations
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onUpdate({ allowedFileTypes: ['zip', 'rar', '7z', 'tar', 'gz'] })
                      }}
                    >
                      Archives
                    </Button>
                  </div>
                </div>

                {/* Current Selected Types */}
                <div className="space-y-2">
                  {getAllowedFileTypes(field).map((type, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={type}
                        onChange={e => {
                          const updatedTypes = [...getAllowedFileTypes(field)]
                          updatedTypes[index] = e.target.value.toLowerCase().replace(/[^a-z0-9*]/g, '')
                          onUpdate({ allowedFileTypes: updatedTypes })
                        }}
                        placeholder="e.g., pdf, jpg, png or * for all"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          const updatedTypes = getAllowedFileTypes(field).filter((_, i) => i !== index)
                          onUpdate({ allowedFileTypes: updatedTypes })
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      const currentTypes = getAllowedFileTypes(field)
                      onUpdate({ allowedFileTypes: [...currentTypes, ''] })
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom File Type
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter file extensions without dots (e.g., pdf, jpg, png) or use * to allow all files
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rating settings */}
      {field.type === 'RATING' && (
        <>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Rating Settings</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minValue" className="text-sm font-medium">
                  Min Rating
                </Label>
                <Input
                  id="minValue"
                  type="number"
                  value={field.minValue || 1}
                  onChange={e => onUpdate({ minValue: Number.parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxValue" className="text-sm font-medium">
                  Max Rating
                </Label>
                <Input
                  id="maxValue"
                  type="number"
                  value={field.maxValue || 5}
                  onChange={e => onUpdate({ maxValue: Number.parseInt(e.target.value) || 5 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Organization */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Organization</h4>
        <div>
          <Label htmlFor="section" className="text-sm font-medium">
            Section Group
          </Label>
          <Input
            id="section"
            value={field.section || ''}
            onChange={e => onUpdate({ section: e.target.value })}
            className="mt-1"
            placeholder="Group related fields together"
          />
          <p className="text-xs text-gray-500 mt-1">
            Fields with the same section name will be grouped together
          </p>
        </div>
      </div>
    </div>
  )
}

// Form Preview Component
function FormPreview({ fields }) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Preview</h2>
        <p className="text-gray-600">This is how your form will appear to users</p>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No fields to preview</p>
        </div>
      ) : (
        <Card className="p-6">
          <form className="space-y-6">
            {fields
              .filter(field => field.isVisible)
              .map(field => (
                <div key={field.id}>
                  <FieldPreview field={field} />
                </div>
              ))}
            <div className="pt-4">
              <Button type="submit" className="w-full">
                Submit Form
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
