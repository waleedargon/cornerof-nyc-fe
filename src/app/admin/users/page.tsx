'use client';

import { User as UserIcon, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import type { User } from "@/lib/types";
import { formatDateOfBirth, calculateAge } from "@/lib/date-utils";
import { deleteUserWithCascade, createUserWithAutoVerification, cleanupOrphanedAuthUser } from "@/lib/admin-actions";

async function getUsers(): Promise<User[]> {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  return userList;
}

function UserActions({ user, onUserUpdated }: { user: User; onUserUpdated: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteUserWithCascade(user.id);
      
      if (result.success) {
        toast({
          title: "User deleted",
          description: "User and all related data have been removed successfully.",
        });
        onUserUpdated();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem 
            onSelect={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{user.name}"? This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove the user from all groups they're a member of</li>
                <li>Transfer group ownership if they're a creator</li>
                <li>Delete their Firebase Auth account</li>
                <li>Remove all their personal data</li>
              </ul>
              <strong className="block mt-2">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [phoneConflictError, setPhoneConflictError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Error",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      setPhoneConflictError(null);
      const result = await createUserWithAutoVerification(formData);
      
      if (result.success) {
        toast({
          title: "User created",
          description: "User has been created and auto-verified successfully.",
        });
        setFormData({ name: '', phone: '', email: '' });
        setIsOpen(false);
        onUserAdded();
      } else {
        // Check if it's a phone number conflict
        if (result.error?.includes('already exists') || result.error?.includes('already registered')) {
          setPhoneConflictError(result.error);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create user",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCleanupOrphanedUser = async () => {
    if (!formData.phone) return;
    
    try {
      setIsCleaningUp(true);
      const result = await cleanupOrphanedAuthUser(formData.phone);
      
      if (result.success) {
        toast({
          title: "Cleanup successful",
          description: "Orphaned user removed. You can now create the user.",
        });
        setPhoneConflictError(null);
        // Automatically retry creating the user
        handleSubmit(new Event('submit') as any);
      } else {
        toast({
          title: "Cleanup failed",
          description: result.error || "Failed to cleanup orphaned user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during cleanup",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user with auto-verification. They will be able to login immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setPhoneConflictError(null); // Clear error when phone changes
                }}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            {phoneConflictError && (
              <div className="col-span-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive mb-2">{phoneConflictError}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  This might be an orphaned Firebase Auth user. You can try to clean it up and retry.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCleanupOrphanedUser}
                  disabled={isCleaningUp}
                >
                  {isCleaningUp ? "Cleaning up..." : "Cleanup & Retry"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isCreating || isCleaningUp}>
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserUpdated = () => {
    fetchUsers(); // Refresh the users list
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage all registered users.</CardDescription>
          </div>
          <AddUserDialog onUserAdded={handleUserUpdated} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.avatarUrl ? (
                    <Image
                      alt="User avatar"
                      className="aspect-square rounded-full object-cover"
                      height="40"
                      src={user.avatarUrl}
                      width="40"
                      data-ai-hint="user avatar"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted text-muted-foreground">
                      <UserIcon className="h-5 w-5" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.phone || 'Not provided'}</TableCell>
                <TableCell>
                  {user.dateOfBirth ? (
                    <div>
                      <div>{formatDateOfBirth(user.dateOfBirth)}</div>
                      <div className="text-sm text-muted-foreground">
                        Age: {calculateAge(user.dateOfBirth)}
                      </div>
                    </div>
                  ) : (
                    user.age ? `Age: ${user.age}` : 'Not provided'
                  )}
                </TableCell>
                <TableCell className="capitalize">{user.sex || 'Not provided'}</TableCell>
                <TableCell>
                  <Badge variant={user.createdByAdmin ? "secondary" : "outline"}>
                    {user.createdByAdmin ? "Admin Created" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UserActions user={user} onUserUpdated={handleUserUpdated} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
