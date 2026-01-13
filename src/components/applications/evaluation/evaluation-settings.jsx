'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, X, Pin, Settings as SettingsIcon } from 'lucide-react';

export default function EvaluationSettings({ applicationId, application }) {
  const [steps, setSteps] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Evaluation configuration
  const [evalConfig, setEvalConfig] = useState({
    minScore: 1,
    maxScore: 10,
    requiredEvaluatorPercentage: 75
  });

  // Cutoff scores
  const [cutoffScores, setCutoffScores] = useState({
    step1: 0,
    step2: 0
  });

  useEffect(() => {
    loadEvaluationData();
  }, [applicationId]);

  const loadEvaluationData = async () => {
    setIsLoading(true);
    try {
      // Load evaluation steps
      const stepsResponse = await fetch(`/api/applications/${applicationId}/evaluation/steps`);
      const stepsData = await stepsResponse.json();

      if (stepsResponse.ok && stepsData.data) {
        setSteps(stepsData.data);
      }

      // Load form fields for pinning
      const fieldsResponse = await fetch(`/api/applications/${applicationId}/fields`);
      const fieldsData = await fieldsResponse.json();

      if (fieldsResponse.ok && fieldsData.data) {
        setFormFields(fieldsData.data);
      }

      // Load evaluation settings
      if (application?.evaluationSettings) {
        const settings = typeof application.evaluationSettings === 'string'
          ? JSON.parse(application.evaluationSettings)
          : application.evaluationSettings;

        setEvalConfig({
          minScore: settings.minScore || 1,
          maxScore: settings.maxScore || 10,
          requiredEvaluatorPercentage: settings.requiredEvaluatorPercentage || 75
        });
      }

      // Load cutoff scores
      const cutoffResponse = await fetch(`/api/applications/${applicationId}/evaluation/cutoff`);
      const cutoffData = await cutoffResponse.json();

      if (cutoffResponse.ok && cutoffData.data?.cutoffScores) {
        const cutoff = typeof cutoffData.data.cutoffScores === 'string'
          ? JSON.parse(cutoffData.data.cutoffScores)
          : cutoffData.data.cutoffScores;

        setCutoffScores({
          step1: cutoff.step1 || 0,
          step2: cutoff.step2 || 0
        });
      }
    } catch (error) {
      console.error('Error loading evaluation data:', error);
      toast.error('Failed to load evaluation data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEvaluationConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationSettings: evalConfig
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save evaluation config');
      }

      toast.success('Evaluation configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveCutoffScores = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/evaluation/cutoff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step1: cutoffScores.step1,
          step2: cutoffScores.step2
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save cutoff scores');
      }

      toast.success('Cutoff scores saved successfully');
    } catch (error) {
      console.error('Error saving cutoff scores:', error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePinnedField = async (stepId, fieldId) => {
    try {
      const step = steps.find(s => s.id === stepId);
      if (!step) return;

      const currentPinned = Array.isArray(step.pinnedFields)
        ? step.pinnedFields
        : (typeof step.pinnedFields === 'string' ? JSON.parse(step.pinnedFields) : []);

      const newPinned = currentPinned.includes(fieldId)
        ? currentPinned.filter(id => id !== fieldId)
        : [...currentPinned, fieldId];

      // Update via API
      const response = await fetch(`/api/applications/${applicationId}/evaluation/steps/${stepId}/pinned-fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedFields: newPinned })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update pinned fields');
      }

      // Update local state
      setSteps(steps.map(s =>
        s.id === stepId
          ? { ...s, pinnedFields: newPinned }
          : s
      ));

      toast.success('Pinned fields updated');
    } catch (error) {
      console.error('Error toggling pinned field:', error);
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading evaluation settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scoring Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Scoring Configuration</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="minScore">Minimum Score</Label>
            <Input
              id="minScore"
              type="number"
              value={evalConfig.minScore}
              onChange={(e) => setEvalConfig({ ...evalConfig, minScore: parseInt(e.target.value) || 1 })}
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Lowest possible score per criterion</p>
          </div>

          <div>
            <Label htmlFor="maxScore">Maximum Score</Label>
            <Input
              id="maxScore"
              type="number"
              value={evalConfig.maxScore}
              onChange={(e) => setEvalConfig({ ...evalConfig, maxScore: parseInt(e.target.value) || 10 })}
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Highest possible score per criterion</p>
          </div>

          <div>
            <Label htmlFor="requiredPercentage">Required Evaluator %</Label>
            <Input
              id="requiredPercentage"
              type="number"
              value={evalConfig.requiredEvaluatorPercentage}
              onChange={(e) => setEvalConfig({ ...evalConfig, requiredEvaluatorPercentage: parseInt(e.target.value) || 75 })}
              min="1"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">% of evaluators needed for valid score</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Current Settings:</strong> Scores range from {evalConfig.minScore} to {evalConfig.maxScore}.
            A submission needs at least {evalConfig.requiredEvaluatorPercentage}% of assigned evaluators to score it for the score to be valid.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={saveEvaluationConfig} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </Card>

      {/* Cutoff Scores */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Cutoff Scores</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Set the minimum passing score for each evaluation step. Submissions below the cutoff will be marked as failed.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="step1Cutoff">Step 1 Cutoff Score</Label>
            <Input
              id="step1Cutoff"
              type="number"
              value={cutoffScores.step1}
              onChange={(e) => setCutoffScores({ ...cutoffScores, step1: parseFloat(e.target.value) || 0 })}
              min={evalConfig.minScore}
              max={evalConfig.maxScore}
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum score to pass Step 1 (range: {evalConfig.minScore} - {evalConfig.maxScore})
            </p>
          </div>

          <div>
            <Label htmlFor="step2Cutoff">Step 2 Cutoff Score</Label>
            <Input
              id="step2Cutoff"
              type="number"
              value={cutoffScores.step2}
              onChange={(e) => setCutoffScores({ ...cutoffScores, step2: parseFloat(e.target.value) || 0 })}
              min={evalConfig.minScore}
              max={evalConfig.maxScore}
              step="0.1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum score to pass Step 2 (range: {evalConfig.minScore} - {evalConfig.maxScore})
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Cutoff scores are indicators for admins. Submissions that meet the cutoff AND have been scored by at least {evalConfig.requiredEvaluatorPercentage}% of evaluators will be marked as passed. Admins still need to manually advance submissions using the action buttons.
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={saveCutoffScores} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Cutoff Scores'}
          </Button>
        </div>
      </Card>

      {/* Evaluation Steps */}
      {steps.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Evaluation Steps</h2>
          <p className="text-gray-600 mb-4">
            No evaluation steps configured yet. Go to the Evaluation page to set up your evaluation pipeline.
          </p>
          <Button onClick={() => window.location.href = `/applications/${applicationId}/evaluation`}>
            Set Up Evaluation
          </Button>
        </Card>
      ) : (
        steps.map((step) => {
          const pinnedFieldIds = Array.isArray(step.pinnedFields)
            ? step.pinnedFields
            : (typeof step.pinnedFields === 'string' ? JSON.parse(step.pinnedFields) : []);

          return (
            <Card key={step.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Step {step.stepNumber}: {step.name}
                  </h2>
                  <Badge variant={step.type === 'INTERVIEW' ? 'default' : 'secondary'} className="mt-1">
                    {step.type === 'INTERVIEW' ? 'Interview' : 'Initial Review'}
                  </Badge>
                </div>
                <Badge variant={step.isActive ? 'default' : 'outline'}>
                  {step.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Criteria */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Evaluation Criteria</h3>
                {step.criteria && step.criteria.length > 0 ? (
                  <div className="space-y-2">
                    {step.criteria.sort((a, b) => a.order - b.order).map((criterion) => (
                      <div key={criterion.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{criterion.name}</span>
                        <Badge variant="outline">Weight: {criterion.weight}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No criteria defined</p>
                )}
              </div>

              {/* Pinnable Fields */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold">Pinned Table Columns</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Select which form fields to display as columns in the scoreboard table for this step
                </p>

                {formFields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No form fields available</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {formFields.map((field) => {
                      const isPinned = pinnedFieldIds.includes(field.id);

                      return (
                        <div
                          key={field.id}
                          className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                            isPinned
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => togglePinnedField(step.id, field.id)}
                        >
                          <Checkbox
                            checked={isPinned}
                            onCheckedChange={() => togglePinnedField(step.id, field.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{field.label}</span>
                              <Badge variant="outline" className="text-xs">{field.type}</Badge>
                            </div>
                            {field.description && (
                              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {pinnedFieldIds.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <strong>{pinnedFieldIds.length}</strong> field(s) will be shown as table columns in the scoreboard
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}

      {/* Helper Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Pin className="h-4 w-4" />
          About Pinned Fields
        </h3>
        <p className="text-sm text-gray-700">
          Pinned fields are custom columns that appear in the evaluation scoreboard table.
          This allows you to quickly view important submission data (like company name, sector, or pitch deck)
          alongside scores without opening each submission individually.
        </p>
      </Card>
    </div>
  );
}
