'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function JudgeScoring({ applicationId, stepId, submissions }) {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (stepId) {
      loadCriteria();
    }
  }, [stepId]);

  const loadCriteria = async () => {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps`
      );
      const data = await response.json();

      if (response.ok) {
        const step = data.data.find(s => s.id === stepId);
        if (step) {
          setCriteria(step.criteria);
        }
      }
    } catch (error) {
      console.error('Error loading criteria:', error);
    }
  };

  const handleScoreChange = (criterionId, value) => {
    setScores({ ...scores, [criterionId]: parseFloat(value) || 0 });
  };

  const handleSubmitScore = async () => {
    // Validate all criteria have scores
    for (const criterion of criteria) {
      if (!scores[criterion.id] || scores[criterion.id] < 1 || scores[criterion.id] > 10) {
        toast.error(`Please provide a score (1-10) for ${criterion.name}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/score`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: selectedSubmission.id,
            criteriaScores: scores,
            notes
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit score');
      }

      toast.success('Score submitted successfully');
      setSelectedSubmission(null);
      setScores({});
      setNotes('');
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Applications to Score</h3>

      <div className="grid gap-4">
        {submissions?.map((submission) => (
          <Card key={submission.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{submission.applicantFirstName} {submission.applicantLastName}</h4>
                <p className="text-sm text-gray-500">{submission.companyName}</p>
                <p className="text-xs text-gray-400">{submission.applicantEmail}</p>
              </div>
              <Button onClick={() => setSelectedSubmission(submission)}>
                Score Application
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Scoring Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Score Application</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <div>
                <h4 className="font-medium">{selectedSubmission.applicantFirstName} {selectedSubmission.applicantLastName}</h4>
                <p className="text-sm text-gray-500">{selectedSubmission.companyName}</p>
              </div>

              <Separator />

              {/* Application Responses */}
              <div>
                <h5 className="font-medium mb-2">Application Responses</h5>
                <div className="bg-gray-50 p-4 rounded space-y-2">
                  {Object.entries(selectedSubmission.responses || {}).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-gray-700">{key}</p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Scoring Form */}
              <div className="space-y-4">
                <h5 className="font-medium">Score Each Criterion (1-10)</h5>
                {criteria.map((criterion) => (
                  <div key={criterion.id}>
                    <Label>{criterion.name} (Weight: {criterion.weight})</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      value={scores[criterion.id] || ''}
                      onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                      placeholder="Enter score 1-10"
                    />
                  </div>
                ))}

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this application"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitScore} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Score'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
