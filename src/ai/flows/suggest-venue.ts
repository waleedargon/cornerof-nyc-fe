/**
 * @fileOverview This file defines a Genkit flow for suggesting a venue to a matched group
 * based on their combined preferences for neighborhood and vibe.
 *
 * - suggestVenue - The main function to suggest a venue.
 * - SuggestVenueInput - The input type for the suggestVenue function.
 * - SuggestVenueOutput - The output type for the suggestVenue function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Venue, GroupIntent } from '@/lib/types';
import { calculateNeighborhoodSimilarity } from '@/lib/venue-matching';


const SuggestVenueInputSchema = z.object({
  neighborhoods: z.array(z.string()).describe('The preferred neighborhoods for the group.'),
  vibes: z.array(z.string()).describe('The desired vibes or atmosphere of the venue.'),
  groupIntent: z.enum(['all-boys', 'all-girls', 'mixed', 'any']).describe('The group composition intent: all-boys, all-girls, mixed (boys & girls), or any (open to all).'),
});
export type SuggestVenueInput = z.infer<typeof SuggestVenueInputSchema>;

const SuggestVenueOutputSchema = z.object({
  venueSuggestion: z.string().describe('The suggested venue name.'),
  reasoning: z.string().describe('Reasoning for the venue suggestion, summarizing the input parameters.'),
  venueUrl: z.string().optional().describe('The venue\'s website URL if available.'),
  venueDescription: z.string().optional().describe('Description of the venue if available.'),
});
export type SuggestVenueOutput = z.infer<typeof SuggestVenueOutputSchema>;

// Define the tool for the AI to use with intelligent neighborhood matching
const getVenuesByNeighborhood = ai.defineTool(
    {
        name: 'getVenuesByNeighborhood',
        description: 'Get a list of available venues with intelligent neighborhood matching (e.g., Greenwich matches Greenwich Village).',
        inputSchema: z.object({
            neighborhood: z.string().describe('The neighborhood to search for venues in.'),
        }),
        outputSchema: z.array(z.object({
            id: z.string(),
            name: z.string(),
            neighborhood: z.string(),
            description: z.string().optional(),
            url: z.string().optional(),
            similarityScore: z.number().describe('How well this venue\'s neighborhood matches the requested neighborhood (0-100)'),
        })),
    },
    async (input) => {
        // Get all venues and use intelligent neighborhood matching
        const venuesCol = collection(db, 'venues');
        const venueSnapshot = await getDocs(venuesCol);
        const allVenues = venueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue));
        
        // Score venues by neighborhood similarity
        const scoredVenues = allVenues.map(venue => ({
            ...venue,
            similarityScore: calculateNeighborhoodSimilarity(venue.neighborhood, input.neighborhood)
        }));
        
        // Return venues with similarity >= 60, sorted by score
        return scoredVenues
            .filter(venue => venue.similarityScore >= 60)
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, 10); // Limit to top 10 matches
    }
);


export async function suggestVenue(input: SuggestVenueInput): Promise<SuggestVenueOutput> {
  return suggestVenueFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVenuePrompt',
  input: {schema: SuggestVenueInputSchema},
  output: {schema: SuggestVenueOutputSchema},
  tools: [getVenuesByNeighborhood],
  prompt: `You are a friendly and helpful venue suggestion expert for groups who have just matched.
Your goal is to suggest a specific, real venue for them to meet up.

1.  Use the 'getVenuesByNeighborhood' tool to find available venues. The tool uses intelligent matching, so "Greenwich" will match "Greenwich Village" etc.
2.  From the venues returned (sorted by neighborhood similarity), select the ONE best venue that matches the group's vibe and composition.
3.  If venues are returned, prioritize those with descriptions and URLs, and include the URL and description in your response.
4.  If no venues are returned, suggest a specific, realistic venue name with a plausible description and website for that neighborhood.
5.  Consider the group composition when making suggestions:
   - "all-boys": Sports bars, breweries, gaming lounges, steakhouses
   - "all-girls": Wine bars, brunch spots, trendy cafes, rooftop lounges
   - "mixed": Casual restaurants, coffee shops, cocktail bars, food halls
   - "any": Popular restaurants, well-known cafes, versatile venues
6.  Match the vibes - "chill" = casual spots, "party" = lively venues, "upscale" = fancy restaurants, etc.
7.  Your reasoning should be warm, concise, and explain why this venue works for their specific vibe and composition.

Neighborhoods: {{{neighborhoods}}}
Vibes: {{{vibes}}}
Group Composition: {{{groupIntent}}}

Always respond with a complete JSON object including venueSuggestion, reasoning, and optionally venueUrl and venueDescription.
`,
});

const suggestVenueFlow = ai.defineFlow(
  {
    name: 'suggestVenueFlow',
    inputSchema: SuggestVenueInputSchema,
    outputSchema: SuggestVenueOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
