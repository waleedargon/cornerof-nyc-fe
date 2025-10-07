import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { GroupIntent } from '@/lib/types';

// Input schema for group matching
export const MatchGroupsInputSchema = z.object({
  userGroup: z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    neighborhoods: z.array(z.string()),
    vibes: z.array(z.string()),
    intent: z.enum(['all-boys', 'all-girls', 'mixed', 'any']),
  }),
  potentialGroups: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number(),
    neighborhoods: z.array(z.string()),
    vibes: z.array(z.string()),
    intent: z.enum(['all-boys', 'all-girls', 'mixed', 'any']),
  })),
});

export type MatchGroupsInput = z.infer<typeof MatchGroupsInputSchema>;

// Output schema
export const MatchGroupsOutputSchema = z.object({
  matches: z.array(z.object({
    groupId: z.string(),
    compatibilityScore: z.number().min(0).max(100),
    reasoning: z.string(),
    intentCompatible: z.boolean(),
  })),
});

export type MatchGroupsOutput = z.infer<typeof MatchGroupsOutputSchema>;

// Helper function to check intent compatibility
function isIntentCompatible(userIntent: GroupIntent, potentialIntent: GroupIntent): boolean {
  // Perfect matches
  if (userIntent === potentialIntent) return true;
  
  // 'any' is compatible with everything
  if (userIntent === 'any' || potentialIntent === 'any') return true;
  
  // 'mixed' is compatible with gender-specific groups
  if (userIntent === 'mixed' && (potentialIntent === 'all-boys' || potentialIntent === 'all-girls')) return true;
  if (potentialIntent === 'mixed' && (userIntent === 'all-boys' || userIntent === 'all-girls')) return true;
  
  // No compatibility between opposite gender-specific groups
  if ((userIntent === 'all-boys' && potentialIntent === 'all-girls') || 
      (userIntent === 'all-girls' && potentialIntent === 'all-boys')) return false;
  
  return false;
}

export async function matchGroups(input: MatchGroupsInput): Promise<MatchGroupsOutput> {
  return matchGroupsFlow(input);
}

const matchGroupsFlow = ai.defineFlow(
  {
    name: 'matchGroupsFlow',
    inputSchema: MatchGroupsInputSchema,
    outputSchema: MatchGroupsOutputSchema,
  },
  async (input) => {
    const { userGroup, potentialGroups } = input;
    
    // First, filter groups based on strict intent compatibility
    const intentCompatibleGroups = potentialGroups.filter(group => 
      isIntentCompatible(userGroup.intent as GroupIntent, group.intent as GroupIntent)
    );
    
    if (intentCompatibleGroups.length === 0) {
      return { matches: [] };
    }
    
    // Create detailed group descriptions for AI analysis
    const userGroupDescription = `Group "${userGroup.name}": ${userGroup.size} people, ${userGroup.intent} group, located in ${userGroup?.neighborhoods?.join(', ')}, vibes: ${userGroup?.vibes?.join(', ')}`;
    
    const potentialGroupDescriptions = intentCompatibleGroups.map(group => 
      `Group "${group.name}" (ID: ${group.id}): ${group.size} people, ${group.intent} group, located in ${group?.neighborhoods?.join(', ')}, vibes: ${group?.vibes?.join(', ')}`
    ).join('\n');
    
    const prompt = `
You are a sophisticated group matching AI for a social meetup platform. Your task is to analyze group compatibility and provide match scores.

USER GROUP:
${userGroupDescription}

POTENTIAL MATCHES (already filtered for intent compatibility):
${potentialGroupDescriptions}

MATCHING CRITERIA:
1. Intent Compatibility (CRITICAL): Groups must have compatible intents:
   - "all-boys" matches with "all-boys", "mixed", or "any"
   - "all-girls" matches with "all-girls", "mixed", or "any"  
   - "mixed" matches with any intent
   - "any" matches with any intent
   - "all-boys" NEVER matches with "all-girls" and vice versa

2. Neighborhood Proximity (HIGH): Groups in the same or nearby neighborhoods score higher
3. Vibe Alignment (MEDIUM): Similar vibes, interests, or activities score higher
4. Group Size Balance (LOW): Similar group sizes work better together

For each potential match, provide:
- compatibilityScore: 0-100 (100 = perfect match)
- reasoning: Brief explanation of why they match or don't match well
- intentCompatible: true (since we pre-filtered, but confirm)

Focus on creating meaningful connections between groups that would genuinely enjoy meeting each other.

IMPORTANT: Respond with ONLY valid JSON. Do not wrap in markdown code blocks. Use this exact format:
{
  "matches": [
    {
      "groupId": "group_id_here",
      "compatibilityScore": 85,
      "reasoning": "Brief explanation of compatibility",
      "intentCompatible": true
    }
  ]
}
`;

    try {
      const response = await ai.generate({
        prompt: prompt,
        config: {
          temperature: 0.2, // Even lower temperature for more consistent JSON output
          maxOutputTokens: 1500,
        },
      });

      const result = response.text;
      
      // Log the raw response for debugging
      console.log('AI Response length:', result?.length || 0);
      console.log('AI Response preview:', result?.substring(0, 200) + '...');
      
      // Parse and validate the AI response
      let parsedResult;
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanResult = result.trim();
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        parsedResult = JSON.parse(cleanResult);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw AI response:', result);
        // Fallback to basic scoring if AI parsing fails
        return {
          matches: intentCompatibleGroups.map(group => ({
            groupId: group.id,
            compatibilityScore: calculateBasicScore(userGroup, group),
            reasoning: "Basic compatibility assessment due to AI parsing error",
            intentCompatible: true,
          }))
        };
      }
      
      // Validate the response structure
      const validatedResult = MatchGroupsOutputSchema.parse(parsedResult);
      
      // Sort matches by compatibility score (highest first)
      validatedResult.matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      
      return validatedResult;
      
    } catch (error) {
      console.error('Error in AI matching:', error);
      
      // Fallback to basic algorithm if AI fails
      return {
        matches: intentCompatibleGroups.map(group => ({
          groupId: group.id,
          compatibilityScore: calculateBasicScore(userGroup, group),
          reasoning: "Basic compatibility assessment due to AI service error",
          intentCompatible: true,
        }))
      };
    }
  }
);

// Fallback basic scoring algorithm
function calculateBasicScore(userGroup: any, potentialGroup: any): number {
  let score = 0;
  
  // Intent compatibility (40 points max)
  if (userGroup.intent === potentialGroup.intent) score += 40;
  else if (userGroup.intent === 'any' || potentialGroup.intent === 'any') score += 32;
  else if (userGroup.intent === 'mixed' || potentialGroup.intent === 'mixed') score += 24;
  
  // Neighborhood match (30 points max)
  const userNeighborhoods = userGroup.neighborhoods.map(n => n.toLowerCase());
  const potentialNeighborhoods = potentialGroup.neighborhoods.map(n => n.toLowerCase());
  
  // Check for exact matches first
  const exactNeighborhoodMatches = userNeighborhoods.filter(neighborhood => 
    potentialNeighborhoods.includes(neighborhood)
  );
  
  if (exactNeighborhoodMatches.length > 0) {
    score += 30;
  } else {
    // Partial credit for similar neighborhoods
    let partialScore = 0;
    for (const userNeighborhood of userNeighborhoods) {
      for (const potentialNeighborhood of potentialNeighborhoods) {
        if (userNeighborhood.includes(potentialNeighborhood) || potentialNeighborhood.includes(userNeighborhood)) {
          partialScore = Math.max(partialScore, 15);
        }
      }
    }
    score += partialScore;
  }
  
  // Vibe compatibility (20 points max)
  const userVibes = userGroup.vibes.map(v => v.toLowerCase());
  const potentialVibes = potentialGroup.vibes.map(v => v.toLowerCase());
  const commonVibes = userVibes.filter(vibe => potentialVibes.includes(vibe));
  score += Math.min(commonVibes.length * 5, 20);
  
  // Size compatibility (10 points max)
  const sizeDifference = Math.abs(userGroup.size - potentialGroup.size);
  if (sizeDifference === 0) score += 10;
  else if (sizeDifference <= 1) score += 8;
  else if (sizeDifference <= 2) score += 5;
  else if (sizeDifference <= 3) score += 2;
  
  return Math.min(score, 100);
}
