
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { collection, addDoc, doc, serverTimestamp, getDoc, query, where, getDocs } from 'firebase/firestore';

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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { User, GroupIntent, GroupMode } from '@/lib/types';
import { generateInviteCode } from '@/lib/utils';
import { ImageUpload } from '@/components/image-upload';
import { uploadGroupImage, deleteFile } from '@/lib/storage';

const formSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.'),
  size: z.array(z.number()).min(1).max(1),
  neighborhood: z.string().min(3, 'Please enter a neighborhood.'),
  vibe: z.string().min(3, "Describe your group's vibe."),
  intent: z.enum(['all-boys', 'all-girls', 'mixed', 'any'], {
    required_error: 'Please select your group intent.',
  }),
  mode: z.enum(['dictator', 'democracy'], {
    required_error: 'Please select your group mode.',
  }),
  picture: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function AddGroupDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      size: [4],
      neighborhood: '',
      vibe: '',
      intent: 'mixed',
      mode: 'dictator',
      picture: null,
    },
  });

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
    form.setValue('picture', file);
  };

  const handleImageRemove = () => {
    setSelectedFile(null);
    form.setValue('picture', null);
  };

  async function onSubmit(values: FormData) {
    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.id);

      // Check if user is already in a group
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('members', 'array-contains', userRef));
      const existingGroupSnapshot = await getDocs(q);

      if (!existingGroupSnapshot.empty) {
        toast({
          title: 'Already in a group',
          description: 'You can only be in one group at a time.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const inviteCode = generateInviteCode();

      // Upload image if provided
      let pictureUrl: string | undefined;
      let picturePath: string | undefined;
      if (selectedFile) {
        setUploadingImage(true);
        try {
          // Create a temporary group ID for the upload
          const tempGroupId = Date.now().toString();
          const uploadResult = await uploadGroupImage(selectedFile, tempGroupId);
          pictureUrl = uploadResult.url;
          picturePath = uploadResult.path;
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast({
            title: 'Image upload failed',
            description: 'The group was not created due to image upload failure.',
            variant: 'destructive',
          });
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      // Create group data
      const groupData: any = {
        name: values.name,
        size: values.size[0],
        neighborhood: values.neighborhood,
        vibe: values.vibe,
        intent: values.intent,
        mode: values.mode,
        creator: userRef,
        members: [userRef],
        createdAt: serverTimestamp(),
        inviteCode: inviteCode,
        isOpenToMatch: true, // Default to open for matching
        hasActiveMatch: false, // Default to no active match
      };

      // Only add picture data if it exists (avoid undefined values)
      if (pictureUrl) {
        groupData.pictureUrl = pictureUrl;
        groupData.picturePath = picturePath;
      }

      await addDoc(collection(db, 'groups'), groupData);

      toast({
        title: 'Group Created!',
        description: `Your group "${values.name}" has been successfully created.`,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating group: ", error);
      toast({
        title: 'Error',
        description: 'Could not create group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Create a Group</DialogTitle>
          <DialogDescription>
            Fill out the details below to get your group started.
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
                        <ImageUpload
                          onImageSelect={handleImageSelect}
                          onImageRemove={handleImageRemove}
                          variant="square"
                          size="lg"
                          disabled={loading || uploadingImage}
                          placeholder="Upload group photo"
                          uploadOptions={{
                            maxSize: 5 * 1024 * 1024, // 5MB
                            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-center">
                      Add a photo to represent your group
                    </FormDescription>
                    {uploadingImage && (
                      <div className="flex items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading image...
                      </div>
                    )}
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
                      <Input placeholder="e.g. Weekend Hikers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Size: {field.value[0]}</FormLabel>
                    <FormControl>
                      <Slider
                        min={2}
                        max={10}
                        step={1}
                        defaultValue={[field.value[0]]}
                        onValueChange={(value) => field.onChange(value)}
                      />
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
                    <FormDescription>
                      What area are you looking to meet in?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vibe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vibe</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Chill, competitive, and fun" {...field} />
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
                          <SelectValue placeholder="Select your group's intent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all-boys">All Guys</SelectItem>
                        <SelectItem value="all-girls">All Girls</SelectItem>
                        <SelectItem value="mixed">Mixed (Guys & Girls)</SelectItem>
                        <SelectItem value="any">Any (Open to All)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Who are you looking to meet up with?
                    </FormDescription>
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
                <Button type="submit" disabled={loading || uploadingImage}>
                  {(loading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploadingImage ? 'Uploading...' : loading ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
