'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { reportMessage } from '@/lib/actions';

interface ReportMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  matchId: string;
  reportedUserId: string;
  reporterUserId: string;
  reporterGroupId: string;
  messageText: string;
  reportedUserName: string;
}

export function ReportMessageDialog({
  open,
  onOpenChange,
  messageId,
  matchId,
  reportedUserId,
  reporterUserId,
  reporterGroupId,
  messageText,
  reportedUserName,
}: ReportMessageDialogProps) {
  const [reason, setReason] = useState<'spam' | 'inappropriate' | 'harassment' | 'other'>('inappropriate');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await reportMessage(
        messageId,
        matchId,
        reportedUserId,
        reporterUserId,
        reporterGroupId,
        reason,
        description.trim() || undefined
      );

      if (result.success) {
        toast({
          title: 'Message Reported',
          description: result.message,
        });
        onOpenChange(false);
        setDescription('');
        setReason('inappropriate');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to report message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Message</DialogTitle>
          <DialogDescription>
            Report this message from <strong>{reportedUserName}</strong> for inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-700 italic">"{messageText}"</p>
          </div>

          <div className="space-y-3">
            <Label>Reason for reporting:</Label>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate">Inappropriate content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment">Harassment or bullying</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or unwanted content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional):</Label>
            <Textarea
              id="description"
              placeholder="Provide more context about why you're reporting this message..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Reporting...' : 'Report Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
