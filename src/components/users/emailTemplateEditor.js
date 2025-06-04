'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Plus,
  Save,
  Eye,
  Send,
  Image,
  Type,
  MousePointer,
  Layout,
  Palette,
  Settings,
  Trash2,
  Copy,
  Upload,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Code,
  Loader2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react'

export default function EmailTemplateEditor() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const { workspaceId, templateId } = params

  const [template, setTemplate] = useState({
    name: '',
    description: '',
    type: 'CUSTOM',
    subject: '',
    previewText: '',
    templateContent: {
      sections: [],
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: 'Inter, sans-serif',
      },
      layout: 'default',
    },
    variables: [],
    isActive: true,
  })

  const [availableComponents, setAvailableComponents] = useState([])
  const [availableVariables, setAvailableVariables] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [previewMode, setPreviewMode] = useState('desktop') // desktop, tablet, mobile
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState({ htmlContent: '', subject: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (workspaceId) {
      fetchComponents()
      fetchVariables()
      if (templateId && templateId !== 'new') {
        fetchTemplate()
      } else {
        setIsLoading(false)
      }
    }
  }, [workspaceId, templateId])

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/email-templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.data.template)
      }
    } catch (error) {
      console.error('Error fetching template:', error)
      toast.error('Failed to load template')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComponents = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/email-templates/components`)
      if (response.ok) {
        const data = await response.json()
        setAvailableComponents(data.data.components)
      }
    } catch (error) {
      console.error('Error fetching components:', error)
    }
  }

  const fetchVariables = async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/email-templates/variables?type=${template.type}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableVariables(data.data.variables)
      }
    } catch (error) {
      console.error('Error fetching variables:', error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const url =
        templateId && templateId !== 'new'
          ? `/api/workspaces/${workspaceId}/email-templates/${templateId}`
          : `/api/workspaces/${workspaceId}/email-templates`

      const method = templateId && templateId !== 'new' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Template ${templateId === 'new' ? 'created' : 'updated'} successfully`)
        if (templateId === 'new') {
          router.push(`/workspaces/${workspaceId}/email-templates/${data.data.template.id}`)
        }
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/email-templates/${templateId}/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variables: {
              // Sample preview data
              firstName: 'John',
              lastName: 'Doe',
              workspaceName: 'Acme Accelerator',
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPreviewContent(data.data)
        setIsPreviewDialogOpen(true)
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      toast.error('Failed to generate preview')
    }
  }

  const handleDragEnd = result => {
    if (!result.destination) return

    const { source, destination } = result

    if (source.droppableId === 'components' && destination.droppableId === 'template') {
      // Adding new component
      const component = availableComponents[source.index]
      const newSection = {
        id: `section-${Date.now()}`,
        type: component.type,
        props: getDefaultProps(component),
      }

      const newSections = [...template.templateContent.sections]
      newSections.splice(destination.index, 0, newSection)

      setTemplate(prev => ({
        ...prev,
        templateContent: {
          ...prev.templateContent,
          sections: newSections,
        },
      }))
    } else if (source.droppableId === 'template' && destination.droppableId === 'template') {
      // Reordering sections
      const newSections = [...template.templateContent.sections]
      const [removed] = newSections.splice(source.index, 1)
      newSections.splice(destination.index, 0, removed)

      setTemplate(prev => ({
        ...prev,
        templateContent: {
          ...prev.templateContent,
          sections: newSections,
        },
      }))
    }
  }

  const getDefaultProps = component => {
    const defaults = {
      header: { logo: '', title: 'Title', backgroundColor: '#f8fafc' },
      hero: { title: 'Hero Title', subtitle: 'Hero subtitle' },
      text: { content: 'Your text content here...', alignment: 'left' },
      button: { text: 'Click Here', link: '#', color: '#3b82f6', size: 'medium' },
      image: { src: '', alt: 'Image', width: '100%', alignment: 'center' },
      divider: { color: '#e5e7eb', thickness: 1, margin: 20 },
      social: { platforms: ['twitter', 'linkedin'], size: 'medium' },
      footer: { companyName: '{{workspaceName}}', unsubscribeLink: '#' },
    }
    return defaults[component.type] || {}
  }

  const updateSectionProps = (sectionId, newProps) => {
    setTemplate(prev => ({
      ...prev,
      templateContent: {
        ...prev.templateContent,
        sections: prev.templateContent.sections.map(section =>
          section.id === sectionId
            ? { ...section, props: { ...section.props, ...newProps } }
            : section
        ),
      },
    }))
  }

  const deleteSection = sectionId => {
    setTemplate(prev => ({
      ...prev,
      templateContent: {
        ...prev.templateContent,
        sections: prev.templateContent.sections.filter(section => section.id !== sectionId),
      },
    }))
    setSelectedSection(null)
  }

  const duplicateSection = sectionId => {
    const sectionToDuplicate = template.templateContent.sections.find(s => s.id === sectionId)
    if (sectionToDuplicate) {
      const duplicatedSection = {
        ...sectionToDuplicate,
        id: `section-${Date.now()}`,
      }

      const sectionIndex = template.templateContent.sections.findIndex(s => s.id === sectionId)
      const newSections = [...template.templateContent.sections]
      newSections.splice(sectionIndex + 1, 0, duplicatedSection)

      setTemplate(prev => ({
        ...prev,
        templateContent: {
          ...prev.templateContent,
          sections: newSections,
        },
      }))
    }
  }

  const renderSectionEditor = section => {
    if (!section) return null

    const commonProps = (
      <div className="space-y-4">
        {section.type === 'text' && (
          <>
            <div>
              <Label>Content</Label>
              <Textarea
                value={section.props.content || ''}
                onChange={e => updateSectionProps(section.id, { content: e.target.value })}
                placeholder="Enter your text content..."
                rows={4}
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={section.props.alignment || 'left'}
                onValueChange={value => updateSectionProps(section.id, { alignment: value })}
              >
                <SelectTrigger className="starboard-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {section.type === 'button' && (
          <>
            <div>
              <Label>Button Text</Label>
              <Input
                value={section.props.text || ''}
                onChange={e => updateSectionProps(section.id, { text: e.target.value })}
                placeholder="Button text"
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input
                value={section.props.link || ''}
                onChange={e => updateSectionProps(section.id, { link: e.target.value })}
                placeholder="https://example.com"
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Button Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={section.props.color || '#3b82f6'}
                  onChange={e => updateSectionProps(section.id, { color: e.target.value })}
                  className="w-12 h-10 p-1 rounded-md"
                />
                <Input
                  value={section.props.color || '#3b82f6'}
                  onChange={e => updateSectionProps(section.id, { color: e.target.value })}
                  className="starboard-input flex-1"
                />
              </div>
            </div>
          </>
        )}

        {section.type === 'image' && (
          <>
            <div>
              <Label>Image URL</Label>
              <Input
                value={section.props.src || ''}
                onChange={e => updateSectionProps(section.id, { src: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                value={section.props.alt || ''}
                onChange={e => updateSectionProps(section.id, { alt: e.target.value })}
                placeholder="Image description"
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Width</Label>
              <Input
                value={section.props.width || '100%'}
                onChange={e => updateSectionProps(section.id, { width: e.target.value })}
                placeholder="100% or 300px"
                className="starboard-input"
              />
            </div>
          </>
        )}

        {section.type === 'hero' && (
          <>
            <div>
              <Label>Hero Title</Label>
              <Input
                value={section.props.title || ''}
                onChange={e => updateSectionProps(section.id, { title: e.target.value })}
                placeholder="Hero title"
                className="starboard-input"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={section.props.subtitle || ''}
                onChange={e => updateSectionProps(section.id, { subtitle: e.target.value })}
                placeholder="Hero subtitle"
                className="starboard-input"
              />
            </div>
          </>
        )}
      </div>
    )

    return commonProps
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-gray-600">Loading template editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.back()} className="p-2">
                ←
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-charcoal-900">
                  {templateId === 'new' ? 'Create Email Template' : 'Edit Email Template'}
                </h1>
                <p className="text-slate-gray-600">Design and customize your email template</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="p-2"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('tablet')}
                  className="p-2"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="p-2"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="starboard-button">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-12 gap-6 min-h-screen">
          {/* Sidebar - Components & Settings */}
          <div className="col-span-3 space-y-6">
            <Tabs defaultValue="components" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>

              <TabsContent value="components" className="space-y-4">
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Email Components</CardTitle>
                    <CardDescription>Drag components to build your email</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="components">
                        {provided => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {availableComponents.map((component, index) => (
                              <Draggable
                                key={component.type}
                                draggableId={component.type}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-50 transition-colors ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <GripVertical className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium text-sm">{component.label}</div>
                                        <div className="text-xs text-gray-500">
                                          {component.description}
                                        </div>
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
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Template Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Template Name</Label>
                      <Input
                        value={template.name}
                        onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Template name"
                        className="starboard-input"
                      />
                    </div>
                    <div>
                      <Label>Email Subject</Label>
                      <Input
                        value={template.subject}
                        onChange={e => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject line"
                        className="starboard-input"
                      />
                    </div>
                    <div>
                      <Label>Preview Text</Label>
                      <Input
                        value={template.previewText || ''}
                        onChange={e =>
                          setTemplate(prev => ({ ...prev, previewText: e.target.value }))
                        }
                        placeholder="Preview text shown in inbox"
                        className="starboard-input"
                      />
                    </div>
                    <div>
                      <Label>Template Type</Label>
                      <Select
                        value={template.type}
                        onValueChange={value => setTemplate(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="starboard-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INVITATION">Invitation</SelectItem>
                          <SelectItem value="WELCOME">Welcome</SelectItem>
                          <SelectItem value="NOTIFICATION">Notification</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Theme Settings */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-semibold">Theme Colors</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Primary</Label>
                          <Input
                            type="color"
                            value={template.templateContent.theme.primaryColor}
                            onChange={e =>
                              setTemplate(prev => ({
                                ...prev,
                                templateContent: {
                                  ...prev.templateContent,
                                  theme: {
                                    ...prev.templateContent.theme,
                                    primaryColor: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="h-8 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Background</Label>
                          <Input
                            type="color"
                            value={template.templateContent.theme.backgroundColor}
                            onChange={e =>
                              setTemplate(prev => ({
                                ...prev,
                                templateContent: {
                                  ...prev.templateContent,
                                  theme: {
                                    ...prev.templateContent.theme,
                                    backgroundColor: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="h-8 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section Editor */}
                {selectedSection && (
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        Edit {selectedSection.type} Section
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateSection(selectedSection.id)}
                            className="p-1"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSection(selectedSection.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{renderSectionEditor(selectedSection)}</CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="variables" className="space-y-4">
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Available Variables</CardTitle>
                    <CardDescription>Click to copy variable to clipboard</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {availableVariables.map(variable => (
                        <div
                          key={variable.key}
                          className="p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${variable.key}}}`)
                            toast.success('Variable copied to clipboard!')
                          }}
                        >
                          <div className="font-mono text-sm text-blue-600">
                            {`{{${variable.key}}}`}
                          </div>
                          <div className="text-xs text-gray-500">{variable.label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Editor Area */}
          <div className="col-span-9">
            <Card className="starboard-card min-h-[800px]">
              <CardContent className="p-6">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div
                    className={`mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 ${
                      previewMode === 'mobile'
                        ? 'max-w-sm'
                        : previewMode === 'tablet'
                        ? 'max-w-md'
                        : 'max-w-2xl'
                    }`}
                  >
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="template">
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`min-h-[500px] ${
                              snapshot.isDraggingOver ? 'bg-blue-50' : ''
                            }`}
                          >
                            {template.templateContent.sections.length === 0 ? (
                              <div className="flex items-center justify-center h-64 text-gray-500">
                                <div className="text-center">
                                  <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                  <p>Drag components here to build your email</p>
                                </div>
                              </div>
                            ) : (
                              template.templateContent.sections.map((section, index) => (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`relative group border-2 border-transparent hover:border-blue-300 ${
                                        selectedSection?.id === section.id ? 'border-blue-500' : ''
                                      } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                      onClick={() => setSelectedSection(section)}
                                    >
                                      {/* Section Content Preview */}
                                      <div className="p-4">
                                        {section.type === 'header' && (
                                          <div
                                            className="text-center p-4"
                                            style={{
                                              backgroundColor: section.props.backgroundColor,
                                            }}
                                          >
                                            <h1 className="text-2xl font-bold">
                                              {section.props.title}
                                            </h1>
                                          </div>
                                        )}
                                        {section.type === 'hero' && (
                                          <div className="text-center p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                            <h1 className="text-3xl font-bold mb-2">
                                              {section.props.title}
                                            </h1>
                                            <p className="text-lg">{section.props.subtitle}</p>
                                          </div>
                                        )}
                                        {section.type === 'text' && (
                                          <div className={`text-${section.props.alignment}`}>
                                            <p>{section.props.content}</p>
                                          </div>
                                        )}
                                        {section.type === 'button' && (
                                          <div className="text-center p-4">
                                            <button
                                              className="px-6 py-3 rounded font-semibold text-white"
                                              style={{ backgroundColor: section.props.color }}
                                            >
                                              {section.props.text}
                                            </button>
                                          </div>
                                        )}
                                        {section.type === 'image' && (
                                          <div className="text-center p-4">
                                            {section.props.src ? (
                                              <img
                                                src={section.props.src}
                                                alt={section.props.alt}
                                                style={{ width: section.props.width }}
                                                className="mx-auto rounded"
                                              />
                                            ) : (
                                              <div className="bg-gray-200 p-8 rounded text-gray-500">
                                                <Image className="h-12 w-12 mx-auto mb-2" />
                                                <p>Add image URL</p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {section.type === 'divider' && (
                                          <div className="py-4">
                                            <hr
                                              style={{
                                                borderColor: section.props.color,
                                                borderWidth: `${section.props.thickness}px`,
                                                margin: `${section.props.margin}px 0`,
                                              }}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Section Controls */}
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center space-x-1 bg-white shadow-md rounded p-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation()
                                              duplicateSection(section.id)
                                            }}
                                            className="p-1"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation()
                                              deleteSection(section.id)
                                            }}
                                            className="p-1 text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Subject: {previewContent.subject}</DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div
              className="bg-white rounded shadow-lg max-w-2xl mx-auto"
              dangerouslySetInnerHTML={{ __html: previewContent.htmlContent }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
