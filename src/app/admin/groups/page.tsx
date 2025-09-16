import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { User } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/firebase";
import type { Group, User as UserType } from "@/lib/types";
import { GroupActions } from "@/components/admin/group-actions";

async function getGroups(): Promise<Group[]> {
  const groupsCol = collection(db, 'groups');
  const groupSnapshot = await getDocs(groupsCol);

  const groupList = await Promise.all(groupSnapshot.docs.map(async (docSnapshot) => {
    const data = docSnapshot.data();
    
    // Fetch creator data
    let creator: UserType = { id: '', name: 'Unknown' };
    if (data.creator && typeof data.creator.path === 'string') {
        const creatorDoc = await getDoc(doc(db, data.creator.path));
        if (creatorDoc.exists()) {
            creator = { id: creatorDoc.id, ...creatorDoc.data() } as UserType;
        }
    } else if (data.creatorName) {
        creator = { id: '', name: data.creatorName };
    }

    // Fetch members data
    let members: UserType[] = [];
    if (data.members && Array.isArray(data.members)) {
      const memberPromises = data.members.map(async (memberRef) => {
        if (memberRef && typeof memberRef.path === 'string') {
            const memberDoc = await getDoc(doc(db, memberRef.path));
            if (memberDoc.exists()) {
                return { id: memberDoc.id, ...memberDoc.data() } as UserType;
            }
        }
        return null;
      });
      members = (await Promise.all(memberPromises)).filter(Boolean) as UserType[];
    }
    
    // Serialize Firestore Timestamp
    const plainData = { ...data };
    if (plainData.createdAt && typeof plainData.createdAt.toDate === 'function') {
      plainData.createdAt = plainData.createdAt.toDate().toISOString();
    }

    return { 
      id: docSnapshot.id, 
      ...plainData,
      creator,
      members
    } as Group;
  }));
  return groupList;
}


export default async function AdminGroupsPage() {
  const groups = await getGroups();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
        <CardDescription>Manage all user-created groups.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Neighborhood</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.size}</TableCell>
                <TableCell>{group.neighborhood}</TableCell>
                <TableCell>{group.creator.name}</TableCell>
                <TableCell>
                  <div className="flex items-center -space-x-2">
                    {group.members && group.members.length > 0 ? (
                      group.members.map((member) => (
                        member.avatarUrl ? (
                          <Image
                              key={member.id}
                              alt={member.name}
                              className="aspect-square rounded-full object-cover border-2 border-background"
                              height="32"
                              src={member.avatarUrl}
                              width="32"
                              data-ai-hint="user avatar"
                              title={member.name}
                          />
                        ) : (
                          <div key={member.id} title={member.name} className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-muted-foreground">
                            <User className="h-4 w-4" />
                          </div>
                        )
                      ))
                    ) : (
                      <div className="flex items-center text-muted-foreground text-sm">
                        <User className="h-4 w-4 mr-1" />
                        <span>No members</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <GroupActions group={group} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
