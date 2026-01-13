'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import JudgeScoring from '@/components/applications/evaluation/judge-scoring';
import Link from 'next/link';

export default function JudgeDashboard() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // In a real implementation, fetch applications assigned to this judge
  // For now, this is a placeholder

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Judge Dashboard</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Assigned Applications</h3>
          <p className="text-gray-500">
            Select an application below to start scoring submissions.
          </p>

          {/* Placeholder - In production, list applications assigned to this judge */}
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Applications assigned to you will appear here.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Navigate to <Link href="/applications" className="text-blue-600 hover:underline">Applications</Link> to view and score applications.
            </p>
          </div>
        </Card>

        {selectedApp && selectedStep && (
          <JudgeScoring
            applicationId={selectedApp.id}
            stepId={selectedStep.id}
            submissions={submissions}
          />
        )}
      </div>
    </div>
  );
}
