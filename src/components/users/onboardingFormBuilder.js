'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit, Eye, Save, X, FormInput, Upload, GripVertical } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', description: 'Single line text input' },
  { value: 'textarea', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'select', label: 'Dropdown', description: 'Single selection dropdown' },
  { value: 'radio', label: 'Radio Buttons', description: 'Single choice from options' },
  { value: 'checkbox', label: 'Checkboxes', description: 'Multiple selections' },
  { value: 'file', label: 'File Upload', description: 'File attachment' },
]

// Field Preview Component
const FieldPreview = ({ field }) => {
  switch (field.type) {
    case 'textarea':
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea placeholder={field.placeholder} disabled className="resize-none" />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )

    case 'select':
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue
                placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )

    case 'radio':
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input type="radio" name={field.id} disabled />
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )

    case 'checkbox':
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox disabled />
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )

    case 'file':
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
          </div>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )

    default:
      return (
        <div className="space-y-2">
          <Label className="flex items-center">
            {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input type={field.type} placeholder={field.placeholder} disabled />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      )
  }
}

// ✅ FIXED: Clean Field Dialog with proper scope
const FieldDialog = ({ isOpen, onClose, field = null, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    description: '',
    options: [],
  })

  // Reset form when dialog opens/closes or field changes
  useEffect(() => {
    if (isOpen) {
      if (field) {
        console.log('📝 FieldDialog: Editing field:', field)
        setFormData({
          type: field.type || 'text',
          label: field.label || '',
          placeholder: field.placeholder || '',
          required: field.required || false,
          description: field.description || '',
          options: field.options || [],
        })
      } else {
        console.log('📝 FieldDialog: Creating new field')
        setFormData({
          type: 'text',
          label: '',
          placeholder: '',
          required: false,
          description: '',
          options: [],
        })
      }
    }
  }, [isOpen, field])

  // ✅ FIXED: Proper handleSave in correct scope
  const handleSave = () => {
    console.log('💾 FieldDialog: handleSave called')
    console.log('💾 FieldDialog: formData:', formData)

    if (!formData.label.trim()) {
      console.log('❌ FieldDialog: Label is empty')
      alert('Please enter a field label')
      return
    }

    const newField = {
      id: field?.id || `field_${Date.now()}`,
      type: formData.type,
      label: formData.label.trim(),
      placeholder: formData.placeholder.trim(),
      required: formData.required,
      description: formData.description.trim(),
      options: formData.options.filter(opt => opt.trim() !== ''),
    }

    console.log('💾 FieldDialog: Calling onSave with:', newField)
    onSave(newField)
    onClose()
  }

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }))
  }

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }))
  }

  const removeOption = index => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const needsOptions = ['select', 'radio', 'checkbox'].includes(formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Add New Field'}</DialogTitle>
          <DialogDescription>Configure the field properties</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="space-y-6 p-1">
            {/* Field Type */}
            <div>
              <Label>Field Type</Label>
              <Select value={formData.type} onValueChange={value => updateField('type', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div>
              <Label>Field Label *</Label>
              <Input
                value={formData.label}
                onChange={e => updateField('label', e.target.value)}
                placeholder="e.g., Company Name"
                className="mt-1"
              />
            </div>

            {/* Placeholder */}
            <div>
              <Label>Placeholder Text</Label>
              <Input
                value={formData.placeholder}
                onChange={e => updateField('placeholder', e.target.value)}
                placeholder="e.g., Enter your company name"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Help Text</Label>
              <Input
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Additional instructions for users"
                className="mt-1"
              />
            </div>

            {/* Required Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.required}
                onCheckedChange={checked => updateField('required', checked)}
                id="required-field"
              />
              <Label htmlFor="required-field">Required field</Label>
            </div>

            {/* Options for select/radio/checkbox */}
            {needsOptions && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Options</Label>
                    <Button variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option}
                          onChange={e => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {formData.options.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p className="text-sm">No options added yet</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Preview */}
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-medium">Preview</Label>
              <div className="p-4 border rounded-lg bg-muted/20">
                <FieldPreview field={formData} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.label.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {field ? 'Update Field' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ✅ FIXED: Main Component with clean state management
export default function RobustOnboardingFormBuilder({ roleForm, setRoleForm }) {
  console.log('🚀 Component rendered with roleForm:', roleForm)

  const fields = roleForm?.onboardingFields || []
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)

  // ✅ FIXED: Clean field management functions
  const updateFields = newFields => {
    console.log('📝 Updating fields:', newFields)
    setRoleForm(prev => ({
      ...prev,
      onboardingFields: newFields,
    }))
  }

  const handleAddField = () => {
    console.log('➕ Adding new field')
    setEditingField(null)
    setEditingIndex(null)
    setIsDialogOpen(true)
  }

  const handleEditField = (field, index) => {
    console.log('✏️ Editing field:', field, 'at index:', index)
    setEditingField(field)
    setEditingIndex(index)
    setIsDialogOpen(true)
  }

  // ✅ FIXED: Proper save handler
  const handleSaveField = newField => {
    console.log('💾 handleSaveField called with:', newField)
    console.log('💾 editingIndex:', editingIndex)

    let newFields
    if (editingIndex !== null) {
      // Update existing field
      newFields = [...fields]
      newFields[editingIndex] = newField
      console.log('💾 Updating existing field')
    } else {
      // Add new field
      newFields = [...fields, newField]
      console.log('💾 Adding new field')
    }

    console.log('💾 New fields array:', newFields)
    updateFields(newFields)
  }

  const handleDeleteField = index => {
    console.log('🗑️ Deleting field at index:', index)
    const newFields = fields.filter((_, i) => i !== index)
    updateFields(newFields)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingField(null)
    setEditingIndex(null)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Onboarding Form Builder</h2>
        <p className="text-muted-foreground mt-2">Create custom onboarding forms</p>

        {/* Debug Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div>
            <strong>Status:</strong> Fields: {fields.length} | Preview: {previewMode ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>Design your custom onboarding form</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent>
          {!previewMode ? (
            /* Edit Mode */
            <div className="space-y-4">
              {/* Fields List */}
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium flex items-center">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="capitalize">{field.type} field</span>
                              {field.options?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {field.options.length} options
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditField(field, index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <FormInput className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No fields added yet</p>
                    <p className="text-sm">Click "Add Field" to get started</p>
                  </div>
                )}
              </div>

              <Button onClick={handleAddField} className="w-full" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 border rounded-lg">
                <h3 className="font-semibold">Form Preview</h3>
                <p className="text-sm text-muted-foreground">
                  This is how the form will appear to users
                </p>
              </div>

              <div className="bg-background p-6 border rounded-lg">
                <div className="mb-6">
                  <h2 className="text-xl font-bold">Complete Your Profile</h2>
                  <p className="text-muted-foreground mt-2">
                    Please provide the required information to complete your onboarding.
                  </p>
                </div>

                <div className="space-y-6">
                  {fields.map(field => (
                    <FieldPreview key={field.id} field={field} />
                  ))}

                  {fields.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No fields to preview</p>
                  )}
                </div>

                {fields.length > 0 && (
                  <div className="mt-8 pt-6 border-t">
                    <Button className="w-full" size="lg">
                      Complete Onboarding
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ FIXED: Clean dialog with proper props */}
      <FieldDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        field={editingField}
        onSave={handleSaveField}
      />
    </div>
  )
}
