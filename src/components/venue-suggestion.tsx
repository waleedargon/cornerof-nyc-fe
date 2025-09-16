'use client';

import { MapPin, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Match } from '@/lib/types';

type VenueSuggestionProps = {
  match: Match;
};

export function VenueSuggestion({ match }: VenueSuggestionProps) {

  if (!match.venueSuggestion || !match.venueReasoning) {
    return null;
  }

  // Format timestamp
  const timestamp = match.createdAt ? 
    new Date(match.createdAt.seconds * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';

  return (
    <div className="space-y-3">
      {/* Venue suggestion card */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
        <div className="flex items-center justify-center">
          <div className="bg-blue-500 p-3 rounded-lg">
            <MapPin className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-blue-900 uppercase tracking-wide">
            {match.venueSuggestion}
          </h3>
          
          {match.venueDescription && (
            <p className="text-gray-600 text-center">
              {match.venueDescription}
            </p>
          )}
          
          {match.venueUrl && (
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
              {new URL(match.venueUrl).hostname}
            </p>
          )}
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded">
              $$$
            </span>
            <span>dinner and drinks</span>
          </div>
        </div>
        
        {match.venueUrl && (
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={() => window.open(match.venueUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            View Details
          </Button>
        )}
      </div>
      
      {/* Reasoning message */}
      <div className="flex justify-end">
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[80%]">
          <p className="text-sm">{match.venueReasoning}</p>
          {timestamp && (
            <p className="text-xs text-blue-100 mt-1">
              {timestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
