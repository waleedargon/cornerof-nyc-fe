-- Seeding initial venue data for NYC neighborhoods
INSERT INTO venues (name, neighborhood, vibe_tags, address, description) VALUES
('The Rooftop at 1 Hotel Brooklyn Bridge', 'Brooklyn Heights', ARRAY['rooftop', 'upscale', 'views', 'cocktails'], '1 Hotel Brooklyn Bridge, Brooklyn, NY', 'Stunning Manhattan skyline views with craft cocktails'),
('House of Yes', 'Bushwick', ARRAY['party', 'dancing', 'creative', 'nightlife'], '2 Wyckoff Ave, Brooklyn, NY', 'Immersive nightlife experience with performances and dancing'),
('Please Don''t Tell (PDT)', 'East Village', ARRAY['speakeasy', 'cocktails', 'intimate', 'craft'], '113 St Marks Pl, New York, NY', 'Hidden speakeasy behind a phone booth with craft cocktails'),
('The Standard High Line', 'Meatpacking District', ARRAY['trendy', 'rooftop', 'dancing', 'upscale'], '848 Washington St, New York, NY', 'Trendy rooftop with Hudson River views and dancing'),
('Beauty & Essex', 'Lower East Side', ARRAY['dinner', 'cocktails', 'upscale', 'group dining'], '146 Essex St, New York, NY', 'Upscale restaurant and bar perfect for group dining'),
('Westlight', 'Williamsburg', ARRAY['rooftop', 'cocktails', 'views', 'trendy'], '111 N 12th St, Brooklyn, NY', 'Rooftop bar with panoramic city views'),
('The Dead Rabbit', 'Financial District', ARRAY['cocktails', 'historic', 'craft', 'intimate'], '30 Water St, New York, NY', 'Award-winning cocktail bar with historic atmosphere'),
('Lavo', 'Midtown East', ARRAY['upscale', 'dancing', 'dinner', 'nightlife'], '39 E 58th St, New York, NY', 'Upscale Italian restaurant and nightclub'),
('Catch', 'Meatpacking District', ARRAY['seafood', 'trendy', 'dinner', 'group dining'], '21 9th Ave, New York, NY', 'Trendy seafood restaurant perfect for groups'),
('The Press Lounge', 'Hell''s Kitchen', ARRAY['rooftop', 'cocktails', 'views', 'upscale'], '653 11th Ave, New York, NY', 'Rooftop lounge with Hudson River and city views');
