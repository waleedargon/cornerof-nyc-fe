/**
 * Venue suggestion service - Admin venues only
 * Only shows admin-created venue suggestions, no AI fallback
 */

import type { Group } from '@/lib/types';
import { 
  getBestVenueSuggestion, 
  generateVenueReasoning 
} from '@/lib/venue-matching';

export type VenueSuggestionResult = {
  venueSuggestion: string;
  reasoning: string;
  venueUrl?: string;
  venueDescription?: string;
  source: 'database' | 'none';
};

/**
 * Get venue suggestion for two matched groups
 * Only uses admin-created venues from database
 */
export async function getVenueSuggestionForMatch(
  group1: Group, 
  group2: Group
): Promise<VenueSuggestionResult | null> {
  console.log(`Getting venue suggestion for ${group1.name} + ${group2.name}`);
  
  try {
    // Try to find a matching venue in the database
    const dbVenue = await getBestVenueSuggestion(group1, group2);
    
    if (dbVenue) {
      console.log(`Found database venue: ${dbVenue.name}`);
      return {
        venueSuggestion: dbVenue.name,
        reasoning: generateVenueReasoning(dbVenue, group1, group2, false),
        venueUrl: dbVenue.url,
        venueDescription: dbVenue.description,
        source: 'database'
      };
    }
    
    // No database match found - return null instead of AI fallback
    console.log('No admin venue found for this neighborhood/vibe combination');
    return null;
    
  } catch (error) {
    console.error('Error getting venue suggestion:', error);
    return null;
  }
}
