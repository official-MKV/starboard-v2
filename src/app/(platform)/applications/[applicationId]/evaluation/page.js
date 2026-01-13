'use client';

import { use, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StepSetup from '@/components/applications/evaluation/step-setup';
import ImprovedImprovedAdminScoreboard from '@/components/applications/evaluation/admin-scoreboard-improved';
import InterviewSlots from '@/components/applications/evaluation/interview-slots';

export default function EvaluationPage({ params }) {
  const { applicationId } = use(params);
  const [steps, setSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSteps();
  }, [applicationId]);

  const loadSteps = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps`
      );
      const data = await response.json();

      if (response.ok) {
        setSteps(data.data);
      }
    } catch (error) {
      console.error('Error loading steps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading evaluation...</div>;
  }

  if (steps.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Evaluation Setup</h1>
        <StepSetup applicationId={applicationId} onSetupComplete={loadSteps} />
      </div>
    );
  }

  const step1 = steps.find(s => s.stepNumber === 1);
  const step2 = steps.find(s => s.stepNumber === 2);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Evaluation Management</h1>

      <Tabs defaultValue="step1" className="w-full">
        <TabsList>
          <TabsTrigger value="step1">
            Step 1: {step1?.name || 'Initial Review'}
          </TabsTrigger>
          <TabsTrigger value="step2">
            Step 2: {step2?.name || 'Interview Round'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="step1" className="space-y-6">
          <ImprovedAdminScoreboard
            applicationId={applicationId}
            stepId={step1?.id}
            stepNumber={1}
            stepName={step1?.name || 'Initial Review'}
            onAction={loadSteps}
          />
        </TabsContent>

        <TabsContent value="step2" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Scoreboard</h3>
              <ImprovedAdminScoreboard
                applicationId={applicationId}
                stepId={step2?.id}
                stepNumber={2}
                stepName={step2?.name || 'Interview Round'}
                onAction={loadSteps}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Interview Slots</h3>
              <InterviewSlots
                applicationId={applicationId}
                stepId={step2?.id}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
