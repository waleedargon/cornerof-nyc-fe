/**
 * Intelligent venue matching system with neighborhood similarity
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Venue, Group, GroupIntent } from '@/lib/types';

/**
 * Calculate neighborhood similarity score between two neighborhoods
 * Uses intelligent matching for variations like "Greenwich" vs "Greenwich Village"
 */
export function calculateNeighborhoodSimilarity(neighborhood1: string, neighborhood2: string): number {
  if (!neighborhood1 || !neighborhood2) return 0;
  
  const n1 = neighborhood1.toLowerCase().trim();
  const n2 = neighborhood2.toLowerCase().trim();
  
  // Exact match
  if (n1 === n2) return 100;
  
  // One contains the other (e.g., "Greenwich" and "Greenwich Village")
  if (n1.includes(n2) || n2.includes(n1)) return 85;
  
  // Split into words and check for common words
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  const commonWords = words1.filter(word => 
    word.length > 2 && words2.some(w => w.includes(word) || word.includes(w))
  );
  
  if (commonWords.length > 0) {
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    return Math.min(similarity * 70, 70); // Max 70 for partial word matches
  }
  
  // Check for common abbreviations/variations
  const variations: Record<string, string[]> = {
    'village': ['vil', 'vlg'],
    'heights': ['hts', 'height'],
    'east': ['e', 'eastern'],
    'west': ['w', 'western'],
    'north': ['n', 'northern'],
    'south': ['s', 'southern'],
    'manhattan': ['nyc', 'new york city'],
    'brooklyn': ['bk', 'bklyn'],
  };
  
  for (const [full, abbrevs] of Object.entries(variations)) {
    if ((n1.includes(full) && abbrevs.some(abbrev => n2.includes(abbrev))) ||
        (n2.includes(full) && abbrevs.some(abbrev => n1.includes(abbrev)))) {
      return 60;
    }
  }
  
  return 0;
}

/**
 * Find venues that match the combined preferences of two groups
 */
export async function findMatchingVenues(group1: Group, group2: Group): Promise<Venue[]> {
  try {
    // Get all venues from database
    const venuesSnapshot = await getDocs(collection(db, 'venues'));
    const allVenues = venuesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Venue));
    
    if (allVenues.length === 0) return [];
    
    // Score each venue based on neighborhood similarity
    const scoredVenues = allVenues.map(venue => {
      const group1Score = calculateNeighborhoodSimilarity(venue.neighborhood, group1.neighborhood);
      const group2Score = calculateNeighborhoodSimilarity(venue.neighborhood, group2.neighborhood);
      
      // Combined score (average of both groups)
      const combinedScore = (group1Score + group2Score) / 2;
      
      return {
        venue,
        score: combinedScore,
        group1Score,
        group2Score
      };
    });
    
    // Filter venues with decent scores (>= 60) and sort by score
    return scoredVenues
      .filter(item => item.score >= 60)
      .sort((a, b) => b.score - a.score)
      .map(item => item.venue);
    
  } catch (error) {
    console.error('Error finding matching venues:', error);
    return [];
  }
}

/**
 * Get the best venue suggestion for two matched groups
 */
export async function getBestVenueSuggestion(group1: Group, group2: Group): Promise<Venue | null> {
  const matchingVenues = await findMatchingVenues(group1, group2);
  
  if (matchingVenues.length > 0) {
    return matchingVenues[0]; // Return the highest scored venue
  }
  
  return null;
}

/**
 * Generate reasoning for why a venue was suggested
 */
export function generateVenueReasoning(
  venue: Venue, 
  group1: Group, 
  group2: Group,
  isAIGenerated: boolean = false
): string {
  if (isAIGenerated) {
    return `AI suggested this venue based on your combined preferences for ${group1.vibe} and ${group2.vibe} vibes in the ${group1.neighborhood}/${group2.neighborhood} area.`;
  }
  
  const group1Score = calculateNeighborhoodSimilarity(venue.neighborhood, group1.neighborhood);
  const group2Score = calculateNeighborhoodSimilarity(venue.neighborhood, group2.neighborhood);
  
  if (group1Score >= 85 || group2Score >= 85) {
    return `Perfect location match! ${venue.name} is right in your preferred neighborhood and matches your ${group1.vibe} and ${group2.vibe} vibes.`;
  } else if (group1Score >= 60 || group2Score >= 60) {
    return `Great choice! ${venue.name} is in a nearby area that works well for both groups' preferences.`;
  } else {
    return `${venue.name} looks like a good spot that should work well for both groups!`;
  }
}

/**
 * Combine two group intents for AI suggestion
 */
export function combineGroupIntents(intent1: GroupIntent, intent2: GroupIntent): GroupIntent {
  // If both are the same, return that
  if (intent1 === intent2) return intent1;
  
  // If either is 'any', return the other
  if (intent1 === 'any') return intent2;
  if (intent2 === 'any') return intent1;
  
  // If one is mixed, return mixed (most flexible)
  if (intent1 === 'mixed' || intent2 === 'mixed') return 'mixed';
  
  // If different gender-specific intents, return mixed
  if ((intent1 === 'all-boys' && intent2 === 'all-girls') ||
      (intent1 === 'all-girls' && intent2 === 'all-boys')) {
    return 'mixed';
  }
  
  // Default to mixed for safety
  return 'mixed';
}

/**
 * Combine two group vibes into a single description
 */
export function combineGroupVibes(vibe1: string, vibe2: string): string {
  if (!vibe1 && !vibe2) return 'casual';
  if (!vibe1) return vibe2;
  if (!vibe2) return vibe1;
  
  const v1 = vibe1.toLowerCase().trim();
  const v2 = vibe2.toLowerCase().trim();
  
  if (v1 === v2) return vibe1;
  
  // Try to find a combined description
  if ((v1.includes('chill') || v1.includes('relax')) && 
      (v2.includes('chill') || v2.includes('relax'))) {
    return 'chill and relaxed';
  }
  
  if ((v1.includes('party') || v1.includes('fun')) && 
      (v2.includes('party') || v2.includes('fun'))) {
    return 'fun and energetic';
  }
  
  // Default combination
  return `${vibe1} and ${vibe2}`;
}

/**
 * Get the primary neighborhood from two groups
 */
export function getPrimaryNeighborhood(group1: Group, group2: Group): string {
  if (!group1.neighborhood && !group2.neighborhood) return 'New York City';
  if (!group1.neighborhood) return group2.neighborhood;
  if (!group2.neighborhood) return group1.neighborhood;
  
  // If neighborhoods are similar, use the more specific one
  const similarity = calculateNeighborhoodSimilarity(group1.neighborhood, group2.neighborhood);
  if (similarity >= 85) {
    // Return the longer one (likely more specific)
    return group1.neighborhood.length > group2.neighborhood.length ? 
           group1.neighborhood : group2.neighborhood;
  }
  
  // If different, combine them
  return `${group1.neighborhood} / ${group2.neighborhood}`;
}
