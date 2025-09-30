'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Neighborhood } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name must be less than 50 characters.'),
  description: z.string().max(200, 'Description must be less than 200 characters.').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditNeighborhoodDialogProps {
  neighborhood: Neighborhood;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNeighborhoodUpdated: () => void;
}

export function EditNeighborhoodDialog({ 
  neighborhood, 
  open, 
  onOpenChange, 
  onNeighborhoodUpdated 
}: EditNeighborhoodDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: neighborhood.name,
      description: neighborhood.description || '',
    },
  });

  // Reset form when neighborhood changes
  useEffect(() => {
    form.reset({
      name: neighborhood.name,
      description: neighborhood.description || '',
    });
  }, [neighborhood, form]);

  async function onSubmit(values: FormData) {
    setLoading(true);

    try {
      const neighborhoodRef = doc(db, 'neighborhoods', neighborhood.id);
      const updateData = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(neighborhoodRef, updateData);

      onNeighborhoodUpdated();
    } catch (error) {
      console.error('Error updating neighborhood:', error);
      toast({
        title: 'Error',
        description: 'Failed to update neighborhood. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Neighborhood</DialogTitle>
          <DialogDescription>
            Update the neighborhood information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Greenwich Village" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the neighborhood as it will appear in dropdowns.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the neighborhood..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help users understand the neighborhood.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Neighborhood
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
