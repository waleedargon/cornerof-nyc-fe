
'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, UserPlus } from 'lucide-react';
import QRCode from 'qrcode.react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function InviteDialog({ group }: { group: Group }) {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (group.inviteCode && typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/join?code=${group.inviteCode}`);
    }
  }, [group.inviteCode]);


  const handleCopyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      toast({ title: 'Invite link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Invite Members to {group.name}</DialogTitle>
          <DialogDescription>
            Share this link or have friends scan the QR code to join your group. Your group code is <span className="font-bold">{group.inviteCode}</span>.
          </DialogDescription>
        </DialogHeader>
        {inviteLink ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-lg border">
              <QRCode value={inviteLink} size={192} renderAs="svg" />
            </div>
            <Button type="button" onClick={handleCopyToClipboard} variant="outline" className="w-full">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Link Copied' : 'Copy Invite Link'}
            </Button>
          </div>
        ) : (
          <div className="text-center p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              This group doesn't have an invite code. This may be an error.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
