'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Pin } from 'lucide-react';

export default function SubmissionsTableConfig({ applicationId, isOpen, onClose, onConfigSaved }) {
  const [formFields, setFormFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, applicationId]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // Load form fields
      const fieldsRes = await fetch(`/api/applications/${applicationId}/fields`);
      const fieldsData = await fieldsRes.json();
      if (fieldsRes.ok) {
        setFormFields(fieldsData.data || []);
      }

      // Load current config
      const configRes = await fetch(`/api/applications/${applicationId}/table-config`);
      const configData = await configRes.json();
      if (configRes.ok && configData.data?.pinnedFields) {
        setSelectedFields(configData.data.pinnedFields);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleField = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/table-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedFields: selectedFields })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast.success('Table configuration saved');
      onConfigSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Submissions Table Columns
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              Select which form fields to display as columns in the submissions table.
              This configuration applies to all users viewing this application.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading fields...</div>
          ) : formFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No form fields available
            </div>
          ) : (
            <div className="space-y-2">
              {formFields
                .sort((a, b) => a.order - b.order)
                .map(field => {
                  const isSelected = selectedFields.includes(field.id);
                  return (
                    <div
                      key={field.id}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleField(field.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleField(field.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium cursor-pointer">
                            {field.label}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {field.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {selectedFields.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  {selectedFields.length} field(s) selected
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
