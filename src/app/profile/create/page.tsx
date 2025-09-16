
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, User as UserIcon, Camera } from 'lucide-react';
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
import { uploadFile } from '@/lib/storage'; // Import the uploadFile function
import Image from 'next/image';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  age: z.coerce.number().min(18, 'You must be at least 18 years old.'),
  sex: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select an option.',
  }),
  avatar: z.any().optional(), // Add avatar to the schema
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CreateProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      age: 18,
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
            age: userData.age || 18,
            sex: userData.sex,
          });
          if (userData.avatarUrl) {
            setAvatarPreview(userData.avatarUrl);
          }
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

  async function onSubmit(values: ProfileFormData) {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to update a profile.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.id);
      let avatarUrl = avatarPreview; // Keep existing avatar by default

      // If a new avatar has been selected, upload it
      if (values.avatar && values.avatar.length > 0) {
        avatarUrl = await uploadFile(values.avatar[0], 'profile-pictures');
      }

      await updateDoc(userRef, {
        name: values.name,
        age: values.age,
        sex: values.sex,
        avatarUrl: avatarUrl,
      });

      localStorage.setItem('userName', values.name);
      if(avatarUrl) {
        localStorage.setItem('userAvatar', avatarUrl);
      }

      toast({
        title: 'Profile Updated!',
        description: 'Your profile information has been saved.',
      });

      router.push('/home');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Could not update your profile. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || fetchingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
                  <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem className="flex justify-center">
                        <FormControl>
                          <div 
                            className="relative h-32 w-32 bg-muted flex items-center justify-center border-2 border-dashed rounded-full overflow-hidden cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {avatarPreview ? (
                              <Image src={avatarPreview} alt="Avatar preview" layout="fill" objectFit="cover" />
                            ) : (
                              <div className="flex flex-col items-center text-muted-foreground">
                                <UserIcon className="h-10 w-10" />
                              </div>
                            )}
                             <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                            <Input 
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        field.onChange(e.target.files);
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setAvatarPreview(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

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
                    name="age"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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

                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
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
