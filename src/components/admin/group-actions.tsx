'use client';

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Group } from "@/lib/types";
import { EditGroupDialog } from "@/components/edit-group-dialog";
import { useState } from "react";

export function GroupActions({ group, onGroupUpdated }: { group: Group; onGroupUpdated: () => void }) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>Edit Group</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <EditGroupDialog group={group} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onGroupUpdated={onGroupUpdated} />
    </>
  );
}
