'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function StepSetup({ applicationId, onSetupComplete }) {
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 state
  const [step1Name, setStep1Name] = useState('Initial Review');
  const [step1Type, setStep1Type] = useState('INITIAL_REVIEW');
  const [step1Criteria, setStep1Criteria] = useState([
    { name: 'Innovation', weight: 1.5, order: 0 },
    { name: 'Team', weight: 1.0, order: 1 },
    { name: 'Market Fit', weight: 1.2, order: 2 }
  ]);

  // Step 2 state
  const [step2Name, setStep2Name] = useState('Interview Round');
  const [step2Type, setStep2Type] = useState('INTERVIEW');
  const [step2Criteria, setStep2Criteria] = useState([
    { name: 'Presentation', weight: 1.0, order: 0 },
    { name: 'Q&A', weight: 1.0, order: 1 }
  ]);

  const addCriterion = (step) => {
    if (step === 1) {
      setStep1Criteria([
        ...step1Criteria,
        { name: '', weight: 1.0, order: step1Criteria.length }
      ]);
    } else {
      setStep2Criteria([
        ...step2Criteria,
        { name: '', weight: 1.0, order: step2Criteria.length }
      ]);
    }
  };

  const removeCriterion = (step, index) => {
    if (step === 1) {
      setStep1Criteria(step1Criteria.filter((_, i) => i !== index));
    } else {
      setStep2Criteria(step2Criteria.filter((_, i) => i !== index));
    }
  };

  const updateCriterion = (step, index, field, value) => {
    if (step === 1) {
      const updated = [...step1Criteria];
      updated[index][field] = value;
      setStep1Criteria(updated);
    } else {
      const updated = [...step2Criteria];
      updated[index][field] = value;
      setStep2Criteria(updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/setup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step1: {
              name: step1Name,
              type: step1Type,
              criteria: step1Criteria
            },
            step2: {
              name: step2Name,
              type: step2Type,
              criteria: step2Criteria
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create evaluation steps');
      }

      toast.success('Evaluation steps created successfully');
      onSetupComplete?.(data.data);
    } catch (error) {
      console.error('Error creating evaluation steps:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1 Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Step 1: {step1Name}</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="step1Name">Step Name</Label>
            <Input
              id="step1Name"
              value={step1Name}
              onChange={(e) => setStep1Name(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Evaluation Criteria</Label>
            <div className="space-y-2 mt-2">
              {step1Criteria.map((criterion, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Criterion name"
                      value={criterion.name}
                      onChange={(e) =>
                        updateCriterion(1, index, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5"
                      placeholder="Weight"
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(1, index, 'weight', parseFloat(e.target.value))
                      }
                      required
                    />
                  </div>
                  {step1Criteria.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCriterion(1, index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => addCriterion(1)}
            >
              Add Criterion
            </Button>
          </div>
        </div>
      </Card>

      {/* Step 2 Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Step 2: {step2Name}</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="step2Name">Step Name</Label>
            <Input
              id="step2Name"
              value={step2Name}
              onChange={(e) => setStep2Name(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Evaluation Criteria</Label>
            <div className="space-y-2 mt-2">
              {step2Criteria.map((criterion, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Criterion name"
                      value={criterion.name}
                      onChange={(e) =>
                        updateCriterion(2, index, 'name', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5"
                      placeholder="Weight"
                      value={criterion.weight}
                      onChange={(e) =>
                        updateCriterion(2, index, 'weight', parseFloat(e.target.value))
                      }
                      required
                    />
                  </div>
                  {step2Criteria.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCriterion(2, index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => addCriterion(2)}
            >
              Add Criterion
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Evaluation Steps'}
        </Button>
      </div>
    </form>
  );
}
