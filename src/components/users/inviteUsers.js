'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Send,
  Loader2,
  Crown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react'

export default function InviteUsersForm({ isOpen, onClose, onSuccess, roles = [] }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingVariables, setIsLoadingVariables] = useState(false)

  const [formData, setFormData] = useState({
    emails: '',
    roleId: '',
    personalMessage: '',
    expiresInDays: 7,
    variableData: {},
  })

  const [templateInfo, setTemplateInfo] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [invitationResults, setInvitationResults] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

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
      variableData: {},
    })
    setTemplateInfo(null)
    setFormErrors({})
    setInvitationResults(null)
  }

  const fetchTemplateVariables = async roleId => {
    try {
      setIsLoadingVariables(true)
      const response = await fetch(`/api/roles/${roleId}/email-template`)

      if (response.ok) {
        const data = await response.json()
        setTemplateInfo(data.data)

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

  const validateForm = () => {
    const errors = {}

    if (!formData.emails.trim()) {
      errors.emails = 'At least one email address is required'
    }

    if (!formData.roleId) {
      errors.roleId = 'Please select a role'
    }

    if (templateInfo?.variables?.required) {
      templateInfo.variables.required.forEach(variable => {
        const value = formData.variableData[variable.name]
        if (!value || value.trim() === '') {
          errors[variable.name] = `${variable.label} is required`
        }
      })
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors')
      return
    }

    setIsLoading(true)
    setInvitationResults(null)

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
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.data.summary) {
          setInvitationResults(data.data)
          
          if (data.data.successful.length > 0) {
            toast.success(data.message)
            if (data.data.failed.length === 0) {
              setTimeout(() => {
                onSuccess?.(data.data)
                onClose()
              }, 2000)
            }
          }
        } else {
          toast.success(data.message)
          onSuccess?.(data.data)
          onClose()
        }
      } else {
        if (data.error?.code === 'INVALID_EMAIL_FORMAT') {
          setFormErrors({ emails: data.error.message })
        } else if (data.error?.code === 'ALL_INVALID' && data.data?.failed) {
          setInvitationResults(data.data)
        } else {
          toast.error(data.error?.message || 'Failed to send invitations')
        }
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const updateVariableData = (variableName, value) => {
    setFormData(prev => ({
      ...prev,
      variableData: { ...prev.variableData, [variableName]: value }
    }))

    if (formErrors[variableName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[variableName]
        return newErrors
      })
    }
  }

  const renderFormField = variable => {
    const value = formData.variableData[variable.name] || ''
    const hasError = formErrors[variable.name]

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
            className={hasError ? 'border-red-500' : ''}
          />
        ) : (
          <Input
            id={variable.name}
            type={variable.type || 'text'}
            value={value}
            onChange={e => updateVariableData(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            className={hasError ? 'border-red-500' : ''}
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
          <DialogDescription>
            Send invitations to new users to join your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                  className={formErrors.emails ? 'border-red-500 font-mono text-sm' : 'font-mono text-sm'}
                />
                {formErrors.emails && (
                  <p className="text-sm text-red-500 mt-1 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formErrors.emails}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inviteRole">Role *</Label>
                  <Select
                    value={formData.roleId}
                    onValueChange={value => setFormData(prev => ({ ...prev, roleId: value }))}
                  >
                    <SelectTrigger className={formErrors.roleId ? 'border-red-500' : ''}>
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
                  {formErrors.roleId && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.roleId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="inviteExpiry">Expires in (days)</Label>
                  <Select
                    value={formData.expiresInDays.toString()}
                    onValueChange={value =>
                      setFormData(prev => ({ ...prev, expiresInDays: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
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
                    {templateInfo.variables.required.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-gray-900">Required Fields</h4>
                        <div className="space-y-4">
                          {templateInfo.variables.required.map(renderFormField)}
                        </div>
                      </div>
                    )}

                    {templateInfo.variables.optional.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-gray-900">Optional Fields</h4>
                        <div className="space-y-4">
                          {templateInfo.variables.optional.map(renderFormField)}
                        </div>
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

          {invitationResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invitation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invitationResults.successful?.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{invitationResults.successful.length} invitations sent successfully</strong>
                      <div className="mt-2 space-y-1">
                        {invitationResults.successful.map(inv => (
                          <div key={inv.id} className="text-sm text-green-700">
                            ✓ {inv.email}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {invitationResults.failed?.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{invitationResults.failed.length} invitations failed</strong>
                      <div className="mt-2 space-y-1">
                        {invitationResults.failed.map((failure, idx) => (
                          <div key={idx} className="text-sm">
                            ✗ {failure.email}: {failure.message}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
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
  )
}