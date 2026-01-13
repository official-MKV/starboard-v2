'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function InterviewSlots({ applicationId, stepId }) {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New slot form
  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    endTime: '',
    zoomLink: ''
  });

  useEffect(() => {
    loadSlots();
  }, [stepId]);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/slots`
      );
      const data = await response.json();

      if (response.ok) {
        setSlots(data.data);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/slots`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateTimeSlots: [newSlot]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create slot');
      }

      toast.success('Interview slot created');
      setNewSlot({ date: '', startTime: '', endTime: '', zoomLink: '' });
      loadSlots();
    } catch (error) {
      console.error('Error creating slot:', error);
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Slot Form */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Add Interview Slot</h4>
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Zoom Link</Label>
              <Input
                type="url"
                value={newSlot.zoomLink}
                onChange={(e) => setNewSlot({ ...newSlot, zoomLink: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Slot'}
          </Button>
        </form>
      </Card>

      {/* Slots List */}
      <div>
        <h4 className="font-medium mb-4">Interview Slots ({slots.length})</h4>
        <div className="space-y-2">
          {slots.map((slot) => (
            <Card key={slot.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {new Date(slot.date).toLocaleDateString()} - {slot.startTime} to {slot.endTime}
                  </p>
                  {slot.zoomLink && (
                    <a
                      href={slot.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {slot.zoomLink}
                    </a>
                  )}
                  {slot.submission && (
                    <p className="text-sm text-gray-500 mt-1">
                      Booked by: {slot.submission.applicantFirstName} {slot.submission.applicantLastName}
                    </p>
                  )}
                </div>
                <Badge variant={slot.submissionId ? 'default' : 'outline'}>
                  {slot.submissionId ? 'Booked' : 'Available'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
