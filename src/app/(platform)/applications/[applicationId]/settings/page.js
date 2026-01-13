'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, GraduationCap, Users, Bell } from 'lucide-react';
import EvaluationSettings from '@/components/applications/evaluation/evaluation-settings';

export default function ApplicationSettingsPage() {
  const params = useParams();
  const applicationId = params.applicationId;

  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // General settings form
  const [generalSettings, setGeneralSettings] = useState({
    title: '',
    description: '',
    isActive: true,
    isPublic: true,
    openDate: '',
    closeDate: '',
    maxSubmissions: '',
    allowMultipleSubmissions: false,
    requireAuthentication: false,
    reviewerInstructions: ''
  });

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load application');
      }

      setApplication(data.data);

      // Populate general settings
      const app = data.data;
      setGeneralSettings({
        title: app.title || '',
        description: app.description || '',
        isActive: app.isActive,
        isPublic: app.isPublic,
        openDate: app.openDate ? new Date(app.openDate).toISOString().slice(0, 16) : '',
        closeDate: app.closeDate ? new Date(app.closeDate).toISOString().slice(0, 16) : '',
        maxSubmissions: app.maxSubmissions || '',
        allowMultipleSubmissions: app.allowMultipleSubmissions,
        requireAuthentication: app.requireAuthentication,
        reviewerInstructions: app.reviewerInstructions || ''
      });
    } catch (error) {
      console.error('Error loading application:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generalSettings,
          openDate: generalSettings.openDate ? new Date(generalSettings.openDate).toISOString() : null,
          closeDate: generalSettings.closeDate ? new Date(generalSettings.closeDate).toISOString() : null,
          maxSubmissions: generalSettings.maxSubmissions ? parseInt(generalSettings.maxSubmissions) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      toast.success('General settings saved');
      loadApplication();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Application Settings</h1>
        <p className="text-gray-600">{application?.title}</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Evaluations
          </TabsTrigger>
          <TabsTrigger value="evaluators" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Evaluators
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Application Title</Label>
                <Input
                  id="title"
                  value={generalSettings.title}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, title: e.target.value })}
                  placeholder="Enter application title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={generalSettings.description}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, description: e.target.value })}
                  placeholder="Enter application description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openDate">Open Date</Label>
                  <Input
                    id="openDate"
                    type="datetime-local"
                    value={generalSettings.openDate}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, openDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="closeDate">Close Date</Label>
                  <Input
                    id="closeDate"
                    type="datetime-local"
                    value={generalSettings.closeDate}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, closeDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="maxSubmissions">Maximum Submissions (optional)</Label>
                <Input
                  id="maxSubmissions"
                  type="number"
                  value={generalSettings.maxSubmissions}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, maxSubmissions: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <Label htmlFor="reviewerInstructions">Reviewer Instructions</Label>
                <Textarea
                  id="reviewerInstructions"
                  value={generalSettings.reviewerInstructions}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, reviewerInstructions: e.target.value })}
                  placeholder="Instructions for reviewers/evaluators"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Access Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Application Active</Label>
                  <p className="text-sm text-gray-500">Allow new submissions</p>
                </div>
                <Switch
                  checked={generalSettings.isActive}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Public</Label>
                  <p className="text-sm text-gray-500">Anyone can view and submit</p>
                </div>
                <Switch
                  checked={generalSettings.isPublic}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, isPublic: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Multiple Submissions</Label>
                  <p className="text-sm text-gray-500">Users can submit more than once</p>
                </div>
                <Switch
                  checked={generalSettings.allowMultipleSubmissions}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, allowMultipleSubmissions: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Authentication</Label>
                  <p className="text-sm text-gray-500">Users must be logged in</p>
                </div>
                <Switch
                  checked={generalSettings.requireAuthentication}
                  onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, requireAuthentication: checked })}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveGeneralSettings} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save General Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Evaluations Settings Tab */}
        <TabsContent value="evaluations">
          <EvaluationSettings applicationId={applicationId} application={application} />
        </TabsContent>

        {/* Evaluators Tab */}
        <TabsContent value="evaluators">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manage Evaluators</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold mb-2">How to Assign Evaluators</h3>
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Create an "Evaluator" role (if not exists) with <strong>"Score Submissions"</strong> permission</li>
                  <li>Invite users with the Evaluator role via User Management</li>
                  <li>Evaluators will automatically see applications they can score</li>
                </ol>
              </div>

              <div>
                <Button
                  onClick={() => window.location.href = '/roles'}
                  variant="default"
                >
                  Manage Roles
                </Button>
                <Button
                  onClick={() => window.location.href = '/users'}
                  variant="outline"
                  className="ml-2"
                >
                  Invite Users
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-3">Evaluation Permissions Guide</h3>
                <div className="grid gap-3">
                  <div className="p-3 border rounded">
                    <p className="font-medium text-sm">evaluation.score</p>
                    <p className="text-xs text-gray-600">Allows scoring submissions (required for Evaluators)</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium text-sm">evaluation.view_scores</p>
                    <p className="text-xs text-gray-600">View aggregate and individual scores</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium text-sm">evaluation.manage</p>
                    <p className="text-xs text-gray-600">Configure evaluation steps and criteria (Admin)</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium text-sm">evaluation.advance</p>
                    <p className="text-xs text-gray-600">Advance candidates to next step (Admin)</p>
                  </div>
                  <div className="p-3 border rounded">
                    <p className="font-medium text-sm">evaluation.admit</p>
                    <p className="text-xs text-gray-600">Final admission of candidates (Admin)</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
            <p className="text-gray-600">Configure email notifications for this application (Coming soon)</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
