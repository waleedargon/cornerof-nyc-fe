'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { Venue } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'Venue name must be at least 2 characters.'),
  neighborhood: z.string().min(2, 'Neighborhood must be at least 2 characters.'),
  description: z.string().optional(),
  url: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

type EditVenueDialogProps = {
    venue: Venue;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditVenueDialog({ venue, open, onOpenChange }: EditVenueDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: venue.name,
      neighborhood: venue.neighborhood,
      description: venue.description || '',
      url: venue.url || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: venue.name,
        neighborhood: venue.neighborhood,
        description: venue.description || '',
        url: venue.url || '',
      });
    }
  }, [open, venue, form]);

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const venueRef = doc(db, 'venues', venue.id);
      // Clean up the data before saving
      const venueData = {
        name: values.name,
        neighborhood: values.neighborhood,
        ...(values.description && { description: values.description }),
        ...(values.url && { url: values.url }),
      };
      await updateDoc(venueRef, venueData);
      toast({
        title: 'Success!',
        description: `Venue "${values.name}" has been updated.`,
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating venue: ', error);
      toast({
        title: 'Error',
        description: 'Failed to update venue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Venue</DialogTitle>
          <DialogDescription>
            Update the details for this venue.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. The Uncommons" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Neighborhood</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Greenwich Village" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="e.g. Upscale restaurant and bar perfect for group dining" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. https://www.venue-website.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
