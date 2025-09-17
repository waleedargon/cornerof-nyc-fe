'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, User as UserIcon } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { ImageUpload } from '@/components/image-upload';
import { uploadUserAvatar, deleteFile } from '@/lib/storage';
import { calculateAge, getMaxBirthDate, getMinBirthDate } from '@/lib/date-utils';


const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required.')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      return finalAge >= 18;
    }, {
      message: 'You must be at least 18 years old.',
    }),
  sex: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select an option.',
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CreateProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [currentAvatarPath, setCurrentAvatarPath] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      dateOfBirth: '',
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast({ title: 'Not Authenticated', description: 'Please sign in to view your profile.', variant: 'destructive' });
      router.push('/signin');
      return;
    }

    const fetchUserData = async () => {
      setFetchingData(true);
      try {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          form.reset({
            name: userData.name || '',
            dateOfBirth: userData.dateOfBirth || '',
            sex: userData.sex,
          });
          setCurrentAvatarUrl(userData.avatarUrl || '');
          setCurrentAvatarPath(userData.avatarPath || '');
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        toast({ title: 'Error', description: 'Could not fetch your profile data.', variant: 'destructive' });
      } finally {
        setFetchingData(false);
      }
    };

    fetchUserData();
  }, [user, authLoading, router, toast, form]);

  const handleImageSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleImageRemove = () => {
    setSelectedFile(null);
    setCurrentAvatarUrl('');
  };

  async function onSubmit(values: ProfileFormData) {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to update a profile.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    let newAvatarUrl = currentAvatarUrl;
    let newAvatarPath = currentAvatarPath;

    try {
      // Handle image upload if a new file was selected
      if (selectedFile) {
        setUploadingImage(true);
        
        // Delete old avatar if it exists
        if (currentAvatarPath) {
          await deleteFile(currentAvatarPath);
        }

        // Upload new avatar
        const uploadResult = await uploadUserAvatar(selectedFile, user.id);
        newAvatarUrl = uploadResult.url;
        newAvatarPath = uploadResult.path;
        
        setUploadingImage(false);
      } else if (!currentAvatarUrl && currentAvatarPath) {
        // User removed avatar - delete from storage
        await deleteFile(currentAvatarPath);
        newAvatarUrl = '';
        newAvatarPath = '';
      }

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name: values.name,
        dateOfBirth: values.dateOfBirth,
        age: calculateAge(values.dateOfBirth), // Calculate and store age for backward compatibility
        sex: values.sex,
        avatarUrl: newAvatarUrl,
        avatarPath: newAvatarPath,
      });

      // Update localStorage
      localStorage.setItem('userName', values.name);
      localStorage.setItem('userAvatar', newAvatarUrl);

      toast({
        title: 'Profile Updated!',
        description: "Your profile information has been saved.",
      });

      router.push('/home');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Could not update your profile. Please try again.', variant: 'destructive' });
      setUploadingImage(false);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || fetchingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header centerLogo={true} backHref="/home" showSignOut={!!user} />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="py-6">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold font-headline text-primary">Edit Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex justify-center">
                    <ImageUpload
                      currentImageUrl={currentAvatarUrl}
                      onImageSelect={handleImageSelect}
                      onImageRemove={handleImageRemove}
                      variant="square"
                      size="xl"
                      disabled={uploadingImage || loading}
                      placeholder="Upload your profile picture"
                      uploadOptions={{
                        maxSize: 2 * 1024 * 1024, // 2MB
                        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
                      }}
                    />
                  </div>
                  
                  {uploadingImage && (
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading image...
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Alex Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            min={getMinBirthDate()}
                            max={getMaxBirthDate()}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Sex</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="other" />
                              </FormControl>
                              <FormLabel className="font-normal">Other</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full" disabled={loading || uploadingImage}>
                    {(loading || uploadingImage) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploadingImage ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
