'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import {
  UserPlus,
  Send,
  Loader2,
  Crown,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  AlertCircle,
} from 'lucide-react'

export default function InviteUsersForm({ isOpen, onClose, onSuccess, roles = [] }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingVariables, setIsLoadingVariables] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    emails: '',
    roleId: '',
    personalMessage: '',
    expiresInDays: 7,
    sendWelcomeEmail: true,
    variableData: {},
  })

  // Template variables state
  const [templateInfo, setTemplateInfo] = useState(null)
  const [variableErrors, setVariableErrors] = useState({})
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  // Fetch template variables when role changes
  useEffect(() => {
    if (formData.roleId) {
      fetchTemplateVariables(formData.roleId)
    } else {
      setTemplateInfo(null)
    }
  }, [formData.roleId])

  const resetForm = () => {
    setFormData({
      emails: '',
      roleId: '',
      personalMessage: '',
      expiresInDays: 7,
      sendWelcomeEmail: true,
      variableData: {},
    })
    setTemplateInfo(null)
    setVariableErrors({})
    setShowOptionalFields(false)
    setShowPreview(false)
    setPreviewData(null)
  }

  const fetchTemplateVariables = async roleId => {
    try {
      setIsLoadingVariables(true)
      const response = await fetch(`/api/roles/${roleId}/email-template`)

      if (response.ok) {
        const data = await response.json()
        setTemplateInfo(data.data)
        console.log(data.data)

        const initialVariableData = {}
        data.data.variables.required.forEach(variable => {
          initialVariableData[variable.name] = ''
        })
        data.data.variables.optional.forEach(variable => {
          initialVariableData[variable.name] = ''
        })

        setFormData(prev => ({
          ...prev,
          variableData: initialVariableData,
        }))
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to load template variables')
      }
    } catch (error) {
      console.error('Error fetching template variables:', error)
      toast.error('Failed to load template variables')
    } finally {
      setIsLoadingVariables(false)
    }
  }

  const updateVariableData = (variableName, value) => {
    setFormData(prev => ({
      ...prev,
      variableData: {
        ...prev.variableData,
        [variableName]: value,
      },
    }))

    if (variableErrors[variableName]) {
      setVariableErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[variableName]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const errors = {}

    // Validate emails
    if (!formData.emails.trim()) {
      toast.error('Please enter at least one email address')
      return false
    }

    if (!formData.roleId) {
      toast.error('Please select a role')
      return false
    }

    if (templateInfo?.variables?.required) {
      templateInfo.variables.required.forEach(variable => {
        const value = formData.variableData[variable.name]
        if (!value || value.trim() === '') {
          errors[variable.name] = `${variable.label} is required`
        }
      })
    }

    if (Object.keys(errors).length > 0) {
      setVariableErrors(errors)
      toast.error('Please fill in all required fields')
      return false
    }

    return true
  }

  const handlePreview = async () => {
    if (!templateInfo?.template?.id) {
      toast.error('No template available for preview')
      return
    }

    try {
      const response = await fetch(`/api/email-templates/${templateInfo.template.id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variableData: formData.variableData,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data.data.preview)
        setShowPreview(true)
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to generate preview')
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      toast.error('Failed to generate preview')
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const emails = formData.emails
        .split(/[,;\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      if (emails.length === 0) {
        toast.error('Please enter valid email addresses')
        return
      }

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          roleId: formData.roleId,
          personalMessage: formData.personalMessage || undefined,
          variableData: formData.variableData,
          expiresInDays: formData.expiresInDays,
          sendWelcomeEmail: formData.sendWelcomeEmail,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`${emails.length} invitation(s) sent successfully`)
        onSuccess?.(data.data)
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to send invitations')
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const renderVariableField = variable => {
    const value = formData.variableData[variable.name] || ''
    const hasError = variableErrors[variable.name]

    return (
      <div key={variable.name} className="space-y-2">
        <Label htmlFor={variable.name} className="flex items-center space-x-2">
          <span>
            {variable.label}
            {variable.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {variable.description && (
            <div className="group relative">
              <Info className="h-4 w-4 text-slate-400 cursor-help" />
              <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-slate-900 text-white text-xs rounded shadow-lg -top-2 left-6">
                {variable.description}
              </div>
            </div>
          )}
        </Label>

        {variable.type === 'textarea' ? (
          <Textarea
            id={variable.name}
            value={value}
            onChange={e => updateVariableData(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            rows={3}
            className={`starboard-input ${hasError ? 'border-red-500' : ''}`}
          />
        ) : (
          <Input
            id={variable.name}
            type={variable.type || 'text'}
            value={value}
            onChange={e => updateVariableData(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            className={`starboard-input ${hasError ? 'border-red-500' : ''}`}
          />
        )}

        {hasError && (
          <p className="text-sm text-red-500 flex items-center space-x-1">
            <AlertCircle className="h-4 w-4" />
            <span>{hasError}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite Users</DialogTitle>
            <DialogDescription>
              Send invitations to new users to join your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="inviteEmails">Email Addresses *</Label>
                  <Textarea
                    id="inviteEmails"
                    value={formData.emails}
                    onChange={e => setFormData(prev => ({ ...prev, emails: e.target.value }))}
                    placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;example@domain.com, another@domain.com"
                    rows={4}
                    className="starboard-input font-mono text-sm"
                  />
                  <p className="text-xs text-slate-gray-500 mt-1">
                    You can enter multiple email addresses separated by commas, semicolons, or new
                    lines
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inviteRole">Role *</Label>
                    <Select
                      value={formData.roleId}
                      onValueChange={value => setFormData(prev => ({ ...prev, roleId: value }))}
                    >
                      <SelectTrigger className="starboard-input">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: role.color }}
                              />
                              <span>{role.name}</span>
                              {role.isDefault && <Crown className="h-3 w-3 text-yellow-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="inviteExpiry">Expires in (days)</Label>
                    <Select
                      value={formData.expiresInDays.toString()}
                      onValueChange={value =>
                        setFormData(prev => ({ ...prev, expiresInDays: parseInt(value) }))
                      }
                    >
                      <SelectTrigger className="starboard-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Template Variables */}
            {formData.roleId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <span>Email Template Variables</span>
                    {isLoadingVariables && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  {templateInfo?.template && (
                    <CardDescription>
                      Using template: <strong>{templateInfo.template.name}</strong>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingVariables ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-slate-gray-500">Loading template variables...</p>
                    </div>
                  ) : templateInfo ? (
                    <>
                      {/* Required Variables */}
                      {templateInfo.variables.required.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-slate-gray-900">Required Fields</h4>
                          <div className="grid grid-cols-1 gap-4">
                            {templateInfo.variables.required.map(renderVariableField)}
                          </div>
                        </div>
                      )}

                      {/* Optional Variables */}
                      {templateInfo.variables.optional.length > 0 && (
                        <div className="space-y-4">
                          <Button
                            variant="ghost"
                            onClick={() => setShowOptionalFields(!showOptionalFields)}
                            className="flex items-center space-x-2 p-0 h-auto"
                          >
                            {showOptionalFields ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>Optional Fields ({templateInfo.variables.optional.length})</span>
                          </Button>

                          {showOptionalFields && (
                            <div className="grid grid-cols-1 gap-4 mt-4">
                              {templateInfo.variables.optional.map(renderVariableField)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Preview Button */}
                      {templateInfo.template && (
                        <div className="pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={handlePreview}
                            className="flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Preview Email</span>
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-gray-500">
                      <p>No custom template variables for this role</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Personal Message */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Message</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="inviteMessage">Personal Message (optional)</Label>
                  <Textarea
                    id="inviteMessage"
                    value={formData.personalMessage}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, personalMessage: e.target.value }))
                    }
                    placeholder="Add a personal message to include in the invitation email..."
                    rows={3}
                    className="starboard-input"
                  />
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="sendWelcomeEmail"
                    checked={formData.sendWelcomeEmail}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, sendWelcomeEmail: checked }))
                    }
                  />
                  <Label htmlFor="sendWelcomeEmail">Send welcome email immediately</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.emails.trim() || !formData.roleId}
              className="starboard-button"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Preview of the invitation email that will be sent</DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Subject:</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded border">{previewData.subject}</div>
              </div>

              <div>
                <Label className="font-medium">Email Content:</Label>
                <div className="mt-1 p-4 bg-white border rounded max-h-96 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: previewData.htmlContent || previewData.content.replace(/\n/g, '<br>'),
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
