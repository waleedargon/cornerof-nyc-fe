
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Edit, Loader2, Upload, X } from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { uploadFile } from '@/lib/storage';
import type { Group, GroupIntent, GroupMode } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.'),
  neighborhood: z.string().min(3, 'Please enter a neighborhood.'),
  vibe: z.string().min(3, "Describe your group's vibe."),
  intent: z.enum(['all-boys', 'all-girls', 'mixed', 'any'], {
    required_error: 'Please select your group intent.',
  }),
  mode: z.enum(['dictator', 'democracy'], {
    required_error: 'Please select your group mode.',
  }),
  picture: z.instanceof(File).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditGroupDialogProps {
  group: Group;
  onGroupUpdated: () => void;
}

export function EditGroupDialog({ group, onGroupUpdated }: EditGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(group.pictureUrl || null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group.name,
      neighborhood: group.neighborhood,
      vibe: group.vibe,
      intent: group.intent,
      mode: group.mode || 'dictator',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('picture', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    form.setValue('picture', undefined);
    setImagePreview(null);
  };

  async function onSubmit(values: FormData) {
    setLoading(true);

    try {
      const groupRef = doc(db, 'groups', group.id);
      let pictureUrl: string | undefined | null = group.pictureUrl;

      // Handle image upload/removal
      if (values.picture) {
        // A new file is uploaded
        if (group.pictureUrl) {
          try {
            const oldImageRef = ref(storage, group.pictureUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.warn('Old image not found, continuing with upload...');
          }
        }
        pictureUrl = await uploadFile(values.picture, 'group-pictures');
      } else if (imagePreview === null && group.pictureUrl) {
        // Image was removed by the user
        try {
          const oldImageRef = ref(storage, group.pictureUrl);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.warn('Old image not found, continuing...');
        }
        pictureUrl = null; // Mark for removal
      }

      const updateData: any = {
        name: values.name,
        neighborhood: values.neighborhood,
        vibe: values.vibe,
        intent: values.intent,
        mode: values.mode,
      };

      if (pictureUrl) {
        updateData.pictureUrl = pictureUrl;
      } else if (pictureUrl === null) {
        updateData.pictureUrl = deleteField(); // Remove the field from Firestore
      }

      await updateDoc(groupRef, updateData);

      toast({
        title: 'Group Updated!',
        description: `Your group "${values.name}" has been successfully updated.`,
      });

      setOpen(false);
      onGroupUpdated();
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: 'Error',
        description: 'Could not update group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Group</DialogTitle>
          <DialogDescription>
            Update your group details. Changes will be visible to all members.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Group Picture Field - Moved to top */}
              <FormField
                control={form.control}
                name="picture"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-center">
                        {imagePreview ? (
                          <div className="relative w-24 h-24">
                            <Image
                              src={imagePreview}
                              alt="Group preview"
                              fill
                              className="object-cover rounded-lg border-2 border-dashed border-gray-300"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                            onClick={() => document.getElementById('edit-picture-upload')?.click()}
                          >
                            <div className="text-center">
                              <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-500">Upload</p>
                            </div>
                          </div>
                        )}
                        <input
                          id="edit-picture-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-center">
                      Update your group photo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter group name" {...field} />
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
                    <Input placeholder="e.g., Greenwich Village" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vibe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Vibe</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your group's vibe and what you're looking for..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Intent</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your group intent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all-boys">All Boys</SelectItem>
                      <SelectItem value="all-girls">All Girls</SelectItem>
                      <SelectItem value="mixed">Mixed (Boys & Girls)</SelectItem>
                      <SelectItem value="any">Any (Open to All)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Mode Field */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your group's decision mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dictator">
                        <div className="flex flex-col">
                          <span className="font-medium text-left">Shot Caller</span>
                          <span className="text-xs text-muted-foreground">Only group creator decides</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="democracy">
                        <div className="flex flex-col">
                          <span className="font-medium text-left">Majority Rules</span>
                          <span className="text-xs text-muted-foreground">Group votes on decisions</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Group
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
