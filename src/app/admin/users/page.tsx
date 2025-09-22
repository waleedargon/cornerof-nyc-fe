import { User as UserIcon } from "lucide-react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
import { db } from "@/lib/firebase";
import type { User } from "@/lib/types";
import { formatDateOfBirth, calculateAge } from "@/lib/date-utils";


async function getUsers(): Promise<User[]> {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  return userList;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage all registered users.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
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
                <TableCell className="capitalize">{user.sex}</TableCell>
                <TableCell>
                  <Badge variant="outline">Active</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">No actions available</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
