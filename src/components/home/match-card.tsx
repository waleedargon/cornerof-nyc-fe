'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import type { Group, Match } from '@/lib/types';

interface MatchCardProps {
  matchInfo: { id: string; otherGroup: Group } | null;
}

export function MatchCard({ matchInfo }: MatchCardProps) {
  if (!matchInfo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Match</CardTitle>
        <CardDescription>You've matched! Start the conversation.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-headline">
              {matchInfo.otherGroup.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              A group of {matchInfo.otherGroup.size} in{' '}
              {matchInfo.otherGroup.neighborhood}
            </p>
          </div>
          <Button asChild>
            <Link href={`/chat/${matchInfo.id}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
