'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, Save } from 'lucide-react';

export default function EvaluatorScoringModal({
  isOpen,
  onClose,
  submission,
  step,
  applicationId,
  minScore = 1,
  maxScore = 10,
  onScoreSubmitted
}) {
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize scores when step changes
  useEffect(() => {
    if (step?.criteria) {
      const initialScores = {};
      step.criteria.forEach(criterion => {
        initialScores[criterion.id] = minScore;
      });
      setScores(initialScores);
    }
  }, [step, minScore]);

  const handleScoreChange = (criterionId, value) => {
    const numValue = parseInt(value) || minScore;
    const clampedValue = Math.max(minScore, Math.min(maxScore, numValue));
    setScores(prev => ({ ...prev, [criterionId]: clampedValue }));
  };

  const calculateTotalScore = () => {
    if (!step?.criteria) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    step.criteria.forEach(criterion => {
      const score = scores[criterion.id] || minScore;
      const weight = criterion.weight || 1.0;
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const handleSubmit = async () => {
    // Validate all criteria are scored
    const allScored = step.criteria.every(criterion => scores[criterion.id] !== undefined);

    if (!allScored) {
      toast.error('Please score all criteria');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${step.id}/score`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: submission.id,
            criteriaScores: scores,
            notes: notes.trim() || null
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit score');
      }

      toast.success('Score submitted successfully');
      onScoreSubmitted?.();
      onClose();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!step) return null;

  const totalScore = calculateTotalScore();
  const sortedCriteria = step.criteria?.sort((a, b) => a.order - b.order) || [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Score Submission - Step {step.stepNumber}: {step.name}
          </SheetTitle>
          <SheetDescription>
            Score each criterion from {minScore} to {maxScore}. Your scores will be used to calculate the aggregate score.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Applicant Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Applicant</p>
            <p className="text-lg font-semibold">{submission.applicantFirstName} {submission.applicantLastName}</p>
            {submission.companyName && (
              <p className="text-sm text-gray-600">{submission.companyName}</p>
            )}
          </div>

          {/* Scoring Criteria */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Evaluation Criteria</h3>
            {sortedCriteria.map((criterion) => (
              <div key={criterion.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Label htmlFor={`score-${criterion.id}`} className="text-base font-medium">
                      {criterion.name}
                    </Label>
                    {criterion.weight !== 1.0 && (
                      <Badge variant="outline" className="ml-2">
                        Weight: {criterion.weight}x
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`score-${criterion.id}`}
                      type="number"
                      min={minScore}
                      max={maxScore}
                      value={scores[criterion.id] || minScore}
                      onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                      className="w-20 text-center text-lg font-bold"
                    />
                    <span className="text-gray-500">/ {maxScore}</span>
                  </div>
                </div>

                {/* Visual score slider */}
                <input
                  type="range"
                  min={minScore}
                  max={maxScore}
                  value={scores[criterion.id] || minScore}
                  onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((scores[criterion.id] - minScore) / (maxScore - minScore)) * 100}%, #e5e7eb ${((scores[criterion.id] - minScore) / (maxScore - minScore)) * 100}%, #e5e7eb 100%)`
                  }}
                />

                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{minScore}</span>
                  <span>{maxScore}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total Score Display */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Weighted Total Score</p>
                <p className="text-xs text-blue-700">Based on all criteria and their weights</p>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {totalScore.toFixed(2)}
                <span className="text-lg text-blue-500"> / {maxScore}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional comments about this submission..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Score
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
