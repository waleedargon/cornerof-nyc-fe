/**
 * Comprehensive venue suggestion service
 * Combines intelligent database matching with AI fallback
 */

import type { Group } from '@/lib/types';
import { 
  getBestVenueSuggestion, 
  generateVenueReasoning, 
  combineGroupIntents, 
  combineGroupVibes, 
  getPrimaryNeighborhood 
} from '@/lib/venue-matching';
import { suggestVenue } from '@/ai/flows/suggest-venue';

export type VenueSuggestionResult = {
  venueSuggestion: string;
  reasoning: string;
  venueUrl?: string;
  venueDescription?: string;
  source: 'database' | 'ai';
};

/**
 * Get venue suggestion for two matched groups
 * Uses intelligent database matching first, falls back to AI if needed
 */
export async function getVenueSuggestionForMatch(
  group1: Group, 
  group2: Group
): Promise<VenueSuggestionResult> {
  console.log(`Getting venue suggestion for ${group1.name} + ${group2.name}`);
  
  try {
    // First, try to find a matching venue in the database
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
    
    // If no database match, use AI suggestion
    console.log('No database venue found, using AI suggestion');
    return await getAIVenueSuggestion(group1, group2);
    
  } catch (error) {
    console.error('Error getting venue suggestion:', error);
    
    // Fallback to AI if database fails
    try {
      return await getAIVenueSuggestion(group1, group2);
    } catch (aiError) {
      console.error('AI venue suggestion also failed:', aiError);
      
      // Final fallback
      return getFallbackVenueSuggestion(group1, group2);
    }
  }
}

/**
 * Get AI-powered venue suggestion
 */
async function getAIVenueSuggestion(group1: Group, group2: Group): Promise<VenueSuggestionResult> {
  const combinedIntent = combineGroupIntents(group1.intent, group2.intent);
  const combinedVibe = combineGroupVibes(group1.vibe, group2.vibe);
  const primaryNeighborhood = getPrimaryNeighborhood(group1, group2);
  
  const aiResult = await suggestVenue({
    neighborhood: primaryNeighborhood,
    vibe: combinedVibe,
    groupIntent: combinedIntent
  });
  
  return {
    venueSuggestion: aiResult.venueSuggestion,
    reasoning: aiResult.reasoning,
    venueUrl: aiResult.venueUrl,
    venueDescription: aiResult.venueDescription,
    source: 'ai'
  };
}

/**
 * Fallback venue suggestion when both database and AI fail
 */
function getFallbackVenueSuggestion(group1: Group, group2: Group): VenueSuggestionResult {
  const neighborhood = getPrimaryNeighborhood(group1, group2);
  const vibe = combineGroupVibes(group1.vibe, group2.vibe);
  
  // Simple fallback suggestions based on vibe
  let venueName = "Central Park";
  let description = "A great outdoor meeting spot";
  
  if (vibe.toLowerCase().includes('chill')) {
    venueName = "The Coffee Bean";
    description = "A cozy coffee shop perfect for relaxed conversations";
  } else if (vibe.toLowerCase().includes('party') || vibe.toLowerCase().includes('fun')) {
    venueName = "The Social Club";
    description = "A lively spot with great atmosphere for groups";
  } else if (vibe.toLowerCase().includes('upscale') || vibe.toLowerCase().includes('fancy')) {
    venueName = "The Metropolitan";
    description = "An upscale dining experience in the heart of the city";
  }
  
  return {
    venueSuggestion: venueName,
    reasoning: `Let's meet at ${venueName} in ${neighborhood}! This should be a great spot that matches your ${vibe} vibe.`,
    venueDescription: description,
    source: 'database' // Use database as source for consistency
  };
}

/**
 * Validate venue suggestion result
 */
export function isValidVenueSuggestion(result: VenueSuggestionResult): boolean {
  return !!(
    result &&
    result.venueSuggestion &&
    result.venueSuggestion.trim().length > 0 &&
    result.reasoning &&
    result.reasoning.trim().length > 0
  );
}
