'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  Palette,
} from 'lucide-react'

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short Text', icon: Type, description: 'Single line text input' },
  { value: 'TEXTAREA', label: 'Long Text', icon: FileText, description: 'Multi-line text area' },
  { value: 'EMAIL', label: 'Email', icon: Mail, description: 'Email address with validation' },
  { value: 'PHONE', label: 'Phone', icon: Phone, description: 'Phone number input' },
  { value: 'NUMBER', label: 'Number', icon: Hash, description: 'Numeric input' },
  { value: 'DATE', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'SELECT', label: 'Dropdown', icon: List, description: 'Single selection dropdown' },
  {
    value: 'RADIO',
    label: 'Radio Buttons',
    icon: CheckSquare,
    description: 'Single choice from options',
  },
  { value: 'CHECKBOX', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple selections' },
  { value: 'BOOLEAN', label: 'Yes/No', icon: CheckSquare, description: 'Single checkbox' },
  { value: 'FILE_UPLOAD', label: 'File Upload', icon: Upload, description: 'Single file upload' },
  {
    value: 'MULTI_FILE',
    label: 'Multiple Files',
    icon: Upload,
    description: 'Multiple file uploads',
  },
  { value: 'RATING', label: 'Rating', icon: Star, description: 'Star rating or numeric rating' },
  { value: 'URL', label: 'Website URL', icon: Type, description: 'URL with validation' },
  { value: 'SECTION_HEADER', label: 'Section Header', icon: Type, description: 'Section divider' },
]

export function FormBuilder({ initialFields = [], onFieldsChange, isPreview = false }) {
  const [fields, setFields] = useState(initialFields)
  const [selectedField, setSelectedField] = useState(null)
  const [showFieldTypes, setShowFieldTypes] = useState(false)

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Field Types Panel */}
      <div className="lg:col-span-1">
        <Card className="starboard-card h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FIELD_TYPES.map(fieldType => {
              const Icon = fieldType.icon
              return (
                <button
                  key={fieldType.value}
                  onClick={() => addField(fieldType)}
                  className="w-full p-3 text-left border border-neutral-200 rounded-lg hover:bg-snow-100 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-5 w-5 text-slate-gray-500 group-hover:text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-charcoal-800 group-hover:text-primary">
                        {fieldType.label}
                      </p>
                      <p className="text-xs text-slate-gray-500 mt-1">{fieldType.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Form Builder */}
      <div className="lg:col-span-2">
        <Card className="starboard-card h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Form Builder</CardTitle>
              <Badge variant="outline">{fields.length} fields</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-snow-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-slate-gray-400" />
                </div>
                <p className="text-slate-gray-600 mb-2">No fields added yet</p>
                <p className="text-sm text-slate-gray-500">
                  Add fields from the panel on the left to start building your form
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="form-fields">
                  {provided => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`p-4 border border-neutral-200 rounded-lg bg-white hover:shadow-soft transition-shadow ${
                                selectedField?.id === field.id
                                  ? 'ring-2 ring-primary/50 border-primary'
                                  : ''
                              } ${snapshot.isDragging ? 'shadow-soft-lg' : ''}`}
                            >
                              <div className="flex items-start space-x-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="p-1 text-slate-gray-400 hover:text-slate-gray-600 cursor-grab"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-charcoal-800">
                                        {field.label}
                                      </h4>
                                      <Badge variant="secondary" className="text-xs">
                                        {field.type}
                                      </Badge>
                                      {field.required && (
                                        <Badge variant="destructive" className="text-xs">
                                          Required
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() =>
                                          updateField(field.id, { isVisible: !field.isVisible })
                                        }
                                        className="p-1 text-slate-gray-400 hover:text-slate-gray-600"
                                      >
                                        {field.isVisible ? (
                                          <Eye className="h-4 w-4" />
                                        ) : (
                                          <EyeOff className="h-4 w-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => duplicateField(field)}
                                        className="p-1 text-slate-gray-400 hover:text-slate-gray-600"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => setSelectedField(field)}
                                        className="p-1 text-slate-gray-400 hover:text-primary"
                                      >
                                        <Settings className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteField(field.id)}
                                        className="p-1 text-red-400 hover:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {field.description && (
                                    <p className="text-sm text-slate-gray-600 mb-2">
                                      {field.description}
                                    </p>
                                  )}

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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Field Settings Panel */}
      <div className="lg:col-span-1">
        <Card className="starboard-card h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Field Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedField ? (
              <FieldSettings
                field={selectedField}
                onUpdate={updates => updateField(selectedField.id, updates)}
              />
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-slate-gray-300 mx-auto mb-3" />
                <p className="text-slate-gray-600 text-sm">Select a field to edit its settings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Field preview component
function FieldPreview({ field }) {
  const baseClasses = 'w-full px-3 py-2 border border-neutral-300 rounded-md text-sm'

  switch (field.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'PHONE':
    case 'URL':
      return (
        <input
          type="text"
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          className={baseClasses}
          disabled
        />
      )

    case 'TEXTAREA':
      return (
        <textarea
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          rows={3}
          className={baseClasses}
          disabled
        />
      )

    case 'NUMBER':
      return (
        <input
          type="number"
          placeholder={field.placeholder || '0'}
          className={baseClasses}
          disabled
        />
      )

    case 'DATE':
      return <input type="date" className={baseClasses} disabled />

    case 'SELECT':
      return (
        <select className={baseClasses} disabled>
          <option>Select an option...</option>
          {field.options?.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )

    case 'RADIO':
      return (
        <div className="space-y-2">
          {field.options?.map((option, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input type="radio" name={field.id} disabled />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )

    case 'CHECKBOX':
      return (
        <div className="space-y-2">
          {field.options?.map((option, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input type="checkbox" disabled />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )

    case 'BOOLEAN':
      return (
        <label className="flex items-center space-x-2">
          <input type="checkbox" disabled />
          <span className="text-sm">{field.label}</span>
        </label>
      )

    case 'FILE_UPLOAD':
    case 'MULTI_FILE':
      return (
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center">
          <Upload className="h-6 w-6 text-slate-gray-400 mx-auto mb-2" />
          <p className="text-sm text-slate-gray-600">Drop files here or click to upload</p>
        </div>
      )

    case 'RATING':
      return (
        <div className="flex items-center space-x-1">
          {Array.from({ length: field.maxValue || 5 }).map((_, index) => (
            <Star key={index} className="h-5 w-5 text-slate-gray-300" />
          ))}
        </div>
      )

    case 'SECTION_HEADER':
      return (
        <div className="border-b border-neutral-200 pb-2">
          <h3 className="text-lg font-semibold text-charcoal-800">{field.label}</h3>
          {field.description && (
            <p className="text-sm text-slate-gray-600 mt-1">{field.description}</p>
          )}
        </div>
      )

    default:
      return (
        <div className="p-4 bg-slate-gray-50 rounded-lg text-center">
          <p className="text-sm text-slate-gray-600">Field preview not available</p>
        </div>
      )
  }
}

// Field settings component
function FieldSettings({ field, onUpdate }) {
  const handleOptionChange = (index, key, value) => {
    const updatedOptions = [...(field.options || [])]
    updatedOptions[index] = { ...updatedOptions[index], [key]: value }
    onUpdate({ options: updatedOptions })
  }

  const addOption = () => {
    const options = field.options || []
    onUpdate({
      options: [
        ...options,
        { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` },
      ],
    })
  }

  const removeOption = index => {
    const updatedOptions = (field.options || []).filter((_, i) => i !== index)
    onUpdate({ options: updatedOptions })
  }

  return (
    <div className="space-y-4">
      {/* Basic Settings */}
      <div>
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={field.label}
          onChange={e => onUpdate({ label: e.target.value })}
          className="starboard-input"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={field.description || ''}
          onChange={e => onUpdate({ description: e.target.value })}
          className="starboard-input"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="placeholder">Placeholder</Label>
        <Input
          id="placeholder"
          value={field.placeholder || ''}
          onChange={e => onUpdate({ placeholder: e.target.value })}
          className="starboard-input"
        />
      </div>

      {/* Required Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="required">Required Field</Label>
        <Switch
          id="required"
          checked={field.required}
          onCheckedChange={checked => onUpdate({ required: checked })}
        />
      </div>

      {/* Section Grouping */}
      <div>
        <Label htmlFor="section">Section (optional)</Label>
        <Input
          id="section"
          value={field.section || ''}
          onChange={e => onUpdate({ section: e.target.value })}
          className="starboard-input"
          placeholder="Group related fields"
        />
      </div>

      {/* Type-specific settings */}
      {(field.type === 'TEXT' || field.type === 'TEXTAREA') && (
        <>
          <div>
            <Label htmlFor="maxLength">Max Length</Label>
            <Input
              id="maxLength"
              type="number"
              value={field.maxLength || ''}
              onChange={e => onUpdate({ maxLength: parseInt(e.target.value) || null })}
              className="starboard-input"
            />
          </div>
        </>
      )}

      {field.type === 'NUMBER' && (
        <>
          <div>
            <Label htmlFor="minValue">Min Value</Label>
            <Input
              id="minValue"
              type="number"
              value={field.minValue || ''}
              onChange={e => onUpdate({ minValue: parseFloat(e.target.value) || null })}
              className="starboard-input"
            />
          </div>
          <div>
            <Label htmlFor="maxValue">Max Value</Label>
            <Input
              id="maxValue"
              type="number"
              value={field.maxValue || ''}
              onChange={e => onUpdate({ maxValue: parseFloat(e.target.value) || null })}
              className="starboard-input"
            />
          </div>
        </>
      )}

      {(field.type === 'SELECT' || field.type === 'RADIO' || field.type === 'CHECKBOX') && (
        <div>
          <Label>Options</Label>
          <div className="space-y-2 mt-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={option.label}
                  onChange={e => handleOptionChange(index, 'label', e.target.value)}
                  className="starboard-input flex-1"
                  placeholder="Option label"
                />
                <button
                  onClick={() => removeOption(index)}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button onClick={addOption} variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {(field.type === 'FILE_UPLOAD' || field.type === 'MULTI_FILE') && (
        <>
          <div>
            <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={field.maxFileSize || ''}
              onChange={e => onUpdate({ maxFileSize: parseInt(e.target.value) || null })}
              className="starboard-input"
            />
          </div>
          {field.type === 'MULTI_FILE' && (
            <div>
              <Label htmlFor="maxFiles">Max Files</Label>
              <Input
                id="maxFiles"
                type="number"
                value={field.maxFiles || ''}
                onChange={e => onUpdate({ maxFiles: parseInt(e.target.value) || null })}
                className="starboard-input"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Form preview component
function FormPreview({ fields }) {
  return (
    <div className="space-y-6">
      {fields.map(field => (
        <div key={field.id}>
          <FieldPreview field={field} />
        </div>
      ))}
    </div>
  )
}
