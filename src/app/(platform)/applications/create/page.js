'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { FormBuilder } from '@/components/applications/form-builder'
import {
  Save,
  Eye,
  Settings,
  FileText,
  Calendar,
  Globe,
  Users,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

export default function CreateApplicationPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

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

    if (applicationData.formFields.length === 0) {
      errors.push('At least one form field is required')
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

  const handleSave = async (publish = false) => {
    const errors = validateApplication()

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        ...applicationData,
        isActive: publish ? true : applicationData.isActive,
        workspaceId: session?.user?.workspaces?.[0]?.id, // Use first workspace
        createdBy: session?.user?.id,
      }

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(
          publish ? 'Application published successfully!' : 'Application saved as draft!'
        )
        router.push(`/applications/${result.application.id}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save application')
      }
    } catch (error) {
      console.error('Save application error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <DashboardNav user={session.user} />

      <div className="">
        <DashboardHeader
          title="Create Application"
          description="Build a new application form for your accelerator program"
          actions={
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button variant="outline" onClick={() => setIsPreview(!isPreview)}>
                <Eye className="mr-2 h-4 w-4" />
                {isPreview ? 'Edit' : 'Preview'}
              </Button>

              <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Draft
              </Button>

              <Button
                onClick={() => handleSave(true)}
                disabled={isLoading}
                className="starboard-button"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Publish
              </Button>
            </div>
          }
        />

        <main className="p-6">
          {isPreview ? (
            <Card className="starboard-card max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>{applicationData.title || 'Untitled Application'}</CardTitle>
                <CardDescription>{applicationData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormBuilder
                  initialFields={applicationData.formFields}
                  onFieldsChange={handleFormFieldsChange}
                  isPreview={true}
                />
              </CardContent>
            </Card>
          ) : (
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
                    <CardDescription>Set up the basic details for your application</CardDescription>
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
                  <CardContent>
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
                    <CardDescription>
                      Configure submission limits and review settings
                    </CardDescription>
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
                        <h4 className="font-medium text-charcoal-800">
                          Allow Multiple Submissions
                        </h4>
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
                        onChange={e =>
                          handleBasicInfoChange('reviewerInstructions', e.target.value)
                        }
                        placeholder="Provide guidance for reviewers on how to evaluate applications..."
                        rows={4}
                        className="starboard-input"
                      />
                      <p className="text-sm text-slate-gray-500 mt-1">
                        These instructions will be shown to reviewers when they evaluate
                        applications
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  )
}
