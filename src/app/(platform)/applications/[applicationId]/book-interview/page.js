'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

export default function BookInterviewPage({ params }) {
  const { applicationId } = params;
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');
  const stepId = searchParams.get('stepId');

  const [slots, setSlots] = useState([]);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (stepId) {
      loadSlots();
      checkExistingBooking();
    }
  }, [stepId]);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/slots?availableOnly=true`
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

  const checkExistingBooking = async () => {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/steps/${stepId}/slots`
      );
      const data = await response.json();

      if (response.ok) {
        const myBooking = data.data.find(slot => slot.submissionId === submissionId);
        if (myBooking) {
          setBookedSlot(myBooking);
        }
      }
    } catch (error) {
      console.error('Error checking booking:', error);
    }
  };

  const handleBookSlot = async (slotId) => {
    setIsBooking(true);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/evaluation/slots/${slotId}/book`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to book slot');
      }

      toast.success('Interview slot booked successfully!');
      setBookedSlot(data.data);
      loadSlots();
    } catch (error) {
      console.error('Error booking slot:', error);
      toast.error(error.message);
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading available slots...</div>;
  }

  if (bookedSlot) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Interview Scheduled</h1>
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{new Date(bookedSlot.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium">{bookedSlot.startTime} - {bookedSlot.endTime}</p>
            </div>
            {bookedSlot.zoomLink && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Zoom Link</p>
                <a
                  href={bookedSlot.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {bookedSlot.zoomLink}
                </a>
              </div>
            )}
            <div className="pt-4 border-t">
              <Badge variant="success">Booked</Badge>
              <p className="text-sm text-gray-500 mt-2">
                You will receive a reminder email before your interview.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Book Your Interview Slot</h1>
      <p className="text-gray-600 mb-6">
        Please select an available time slot for your interview.
      </p>

      {slots.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">
            No interview slots available at this time. Please check back later.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {slots.map((slot) => (
            <Card key={slot.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {new Date(slot.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {slot.startTime} - {slot.endTime}
                  </p>
                </div>
                <Button
                  onClick={() => handleBookSlot(slot.id)}
                  disabled={isBooking}
                >
                  {isBooking ? 'Booking...' : 'Book This Slot'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
