'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardHeader } from '@/components/dashboard/header'
import { FormBuilder } from '@/components/applications/form-builder'
import { Save, ArrowLeft, Loader2, AlertCircle, FileText, Calendar, Settings } from 'lucide-react'
import { toast } from 'sonner'

export default function EditApplicationPage({ params }) {
  // Unwrap params Promise for Next.js 15+ compatibility
  const { applicationId } = use(params)
  const router = useRouter()

  const [application, setApplication] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  const [applicationData, setApplicationData] = useState({
    title: '',
    description: '',
    isActive: true,
    isPublic: true,
    openDate: '',
    closeDate: '',
    maxSubmissions: '',
    allowMultipleSubmissions: false,
    requireAuthentication: false,
    reviewerInstructions: '',
    formFields: [],
  })

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/applications/${applicationId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to fetch application')
        }

        const data = await response.json()
        setApplication(data.application)

        // Pre-fill form data
        setApplicationData({
          title: data.application.title || '',
          description: data.application.description || '',
          isActive: data.application.isActive ?? true,
          isPublic: data.application.isPublic ?? true,
          openDate: data.application.openDate
            ? new Date(data.application.openDate).toISOString().slice(0, 16)
            : '',
          closeDate: data.application.closeDate
            ? new Date(data.application.closeDate).toISOString().slice(0, 16)
            : '',
          maxSubmissions: data.application.maxSubmissions || '',
          allowMultipleSubmissions: data.application.allowMultipleSubmissions ?? false,
          requireAuthentication: data.application.requireAuthentication ?? false,
          reviewerInstructions: data.application.reviewerInstructions || '',
          formFields: data.application.formFields || [],
        })
      } catch (err) {
        console.error('Error fetching application:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (applicationId) {
      fetchApplication()
    }
  }, [applicationId])

  const handleBasicInfoChange = (field, value) => {
    setApplicationData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFormFieldsChange = fields => {
    setApplicationData(prev => ({
      ...prev,
      formFields: fields,
    }))
  }

  const validateApplication = () => {
    const errors = []

    if (!applicationData.title.trim()) {
      errors.push('Application title is required')
    }

    if (!applicationData.description.trim()) {
      errors.push('Application description is required')
    }

    if (applicationData.openDate && applicationData.closeDate) {
      const openDate = new Date(applicationData.openDate)
      const closeDate = new Date(applicationData.closeDate)

      if (closeDate <= openDate) {
        errors.push('Close date must be after open date')
      }
    }

    return errors
  }

  const handleSave = async () => {
    const errors = validateApplication()

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        ...applicationData,
        // Convert dates back to proper format
        openDate: applicationData.openDate
          ? new Date(applicationData.openDate).toISOString()
          : null,
        closeDate: applicationData.closeDate
          ? new Date(applicationData.closeDate).toISOString()
          : null,
        // Convert empty strings to null for numeric fields
        maxSubmissions:
          applicationData.maxSubmissions === ''
            ? null
            : parseInt(applicationData.maxSubmissions, 10) || null,
      }

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Application updated successfully!')
        router.push(`/applications/${applicationId}`)
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update application')
      }
    } catch (error) {
      console.error('Save application error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Failed to load application</p>
            <p className="text-sm text-slate-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-slate-gray-400" />
            <p className="text-slate-gray-600 mb-2">Application not found</p>
            <Button onClick={() => router.push('/applications')} variant="outline">
              Back to Applications
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="">
        <DashboardHeader
          title={`Edit: ${application.title}`}
          description="Update your application settings and form fields"
          actions={
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/applications/${applicationId}`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Application
              </Button>

              <Button onClick={handleSave} disabled={isSaving} className="starboard-button">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          }
        />

        <main className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Form Builder</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Update the basic details for your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label htmlFor="title">Application Title *</Label>
                      <Input
                        id="title"
                        value={applicationData.title}
                        onChange={e => handleBasicInfoChange('title', e.target.value)}
                        placeholder="e.g., Spring 2024 Accelerator Program"
                        className="starboard-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={applicationData.description}
                        onChange={e => handleBasicInfoChange('description', e.target.value)}
                        placeholder="Describe your accelerator program and what applicants can expect..."
                        rows={4}
                        className="starboard-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="openDate">Application Open Date</Label>
                        <Input
                          id="openDate"
                          type="datetime-local"
                          value={applicationData.openDate}
                          onChange={e => handleBasicInfoChange('openDate', e.target.value)}
                          className="starboard-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="closeDate">Application Close Date</Label>
                        <Input
                          id="closeDate"
                          type="datetime-local"
                          value={applicationData.closeDate}
                          onChange={e => handleBasicInfoChange('closeDate', e.target.value)}
                          className="starboard-input"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-charcoal-800">Public Application</h4>
                        <p className="text-sm text-slate-gray-600">
                          Allow anyone to discover and apply to this program
                        </p>
                      </div>
                      <Switch
                        checked={applicationData.isPublic}
                        onCheckedChange={checked => handleBasicInfoChange('isPublic', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-charcoal-800">Active Application</h4>
                        <p className="text-sm text-slate-gray-600">
                          Accept new applications for this program
                        </p>
                      </div>
                      <Switch
                        checked={applicationData.isActive}
                        onCheckedChange={checked => handleBasicInfoChange('isActive', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form">
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Form Builder</CardTitle>
                  <CardDescription>
                    Design your application form by adding and configuring fields
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <FormBuilder
                    initialFields={applicationData.formFields}
                    onFieldsChange={handleFormFieldsChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="starboard-card">
                <CardHeader>
                  <CardTitle>Application Settings</CardTitle>
                  <CardDescription>Configure submission limits and review settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="maxSubmissions">Maximum Submissions</Label>
                    <Input
                      id="maxSubmissions"
                      type="number"
                      value={applicationData.maxSubmissions}
                      onChange={e => handleBasicInfoChange('maxSubmissions', e.target.value)}
                      placeholder="Leave empty for unlimited"
                      className="starboard-input"
                    />
                    <p className="text-sm text-slate-gray-500 mt-1">
                      Set a limit on total number of submissions (optional)
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-charcoal-800">Allow Multiple Submissions</h4>
                      <p className="text-sm text-slate-gray-600">
                        Allow applicants to submit multiple applications
                      </p>
                    </div>
                    <Switch
                      checked={applicationData.allowMultipleSubmissions}
                      onCheckedChange={checked =>
                        handleBasicInfoChange('allowMultipleSubmissions', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-charcoal-800">Require Authentication</h4>
                      <p className="text-sm text-slate-gray-600">
                        Require applicants to create an account before applying
                      </p>
                    </div>
                    <Switch
                      checked={applicationData.requireAuthentication}
                      onCheckedChange={checked =>
                        handleBasicInfoChange('requireAuthentication', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="reviewerInstructions">Reviewer Instructions</Label>
                    <Textarea
                      id="reviewerInstructions"
                      value={applicationData.reviewerInstructions}
                      onChange={e => handleBasicInfoChange('reviewerInstructions', e.target.value)}
                      placeholder="Provide guidance for reviewers on how to evaluate applications..."
                      rows={4}
                      className="starboard-input"
                    />
                    <p className="text-sm text-slate-gray-500 mt-1">
                      These instructions will be shown to reviewers when they evaluate applications
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
