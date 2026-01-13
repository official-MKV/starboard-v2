'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminScoreboard({ applicationId, stepId, stepNumber, onAction }) {
  const [scoreboard, setScoreboard] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    loadScoreboard();
  }, [stepId]);

  const loadScoreboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/scoreboard`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load scoreboard');
      }

      setScoreboard(data.data);
    } catch (error) {
      console.error('Error loading scoreboard:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(scoreboard.map(s => s.submissionId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleAdvance = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one submission');
      return;
    }

    setIsActing(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/advance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionIds: selectedIds })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to advance submissions');
      }

      toast.success(`Advanced ${data.data.count} submissions to Step 2`);
      setSelectedIds([]);
      loadScoreboard();
      onAction?.();
    } catch (error) {
      console.error('Error advancing submissions:', error);
      toast.error(error.message);
    } finally {
      setIsActing(false);
    }
  };

  const handleAdmit = async () {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one submission');
      return;
    }

    setIsActing(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/admit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionIds: selectedIds })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to admit submissions');
      }

      toast.success(`Admitted ${data.data.count} submissions`);
      setSelectedIds([]);
      loadScoreboard();
      onAction?.();
    } catch (error) {
      console.error('Error admitting submissions:', error);
      toast.error(error.message);
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading scoreboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            Submissions ({scoreboard.length})
          </h3>
          <p className="text-sm text-gray-500">
            {selectedIds.length} selected
          </p>
        </div>
        <div className="flex gap-2">
          {stepNumber === 1 && (
            <Button
              onClick={handleAdvance}
              disabled={selectedIds.length === 0 || isActing}
            >
              Advance to Step 2
            </Button>
          )}
          <Button
            onClick={handleAdmit}
            disabled={selectedIds.length === 0 || isActing}
            variant="default"
          >
            Admit
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="p-3 text-left">
                  <Checkbox
                    checked={selectedIds.length === scoreboard.length && scoreboard.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 text-left">Applicant</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Average Score</th>
                <th className="p-3 text-left">Evaluators Scored</th>
                <th className="p-3 text-left">Current Step</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((submission) => (
                <tr key={submission.submissionId} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.includes(submission.submissionId)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds([...selectedIds, submission.submissionId]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== submission.submissionId));
                        }
                      }}
                    />
                  </td>
                  <td className="p-3">
                    <div>{submission.applicantName}</div>
                    <div className="text-sm text-gray-500">{submission.applicantEmail}</div>
                  </td>
                  <td className="p-3">{submission.companyName || '-'}</td>
                  <td className="p-3">
                    {submission.isValid === false ? (
                      <div>
                        <Badge variant="destructive">Invalid</Badge>
                        <p className="text-xs text-red-600 mt-1">{submission.validityMessage}</p>
                      </div>
                    ) : submission.averageScore !== null ? (
                      <Badge variant={submission.averageScore >= 7 ? 'success' : 'default'}>
                        {submission.averageScore.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not scored</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    {submission.judgeCount}/{submission.totalJudges || '?'}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">Step {submission.currentStep}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
