-- Creating database schema for Corner Of social app
-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  profile_photo_url TEXT,
  age INTEGER,
  sex VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table for friend groups
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_size INTEGER NOT NULL,
  neighborhood VARCHAR(100),
  vibe VARCHAR(200),
  looking_for VARCHAR(200),
  share_link VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Matches between groups
CREATE TABLE IF NOT EXISTS group_matches (
  id SERIAL PRIMARY KEY,
  group1_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  group2_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  group1_liked BOOLEAN DEFAULT false,
  group2_liked BOOLEAN DEFAULT false,
  is_mutual_match BOOLEAN DEFAULT false,
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group1_id, group2_id)
);

-- Chat messages between matched groups
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES group_matches(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'venue_suggestion', 'system'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Venues for recommendations
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  neighborhood VARCHAR(100) NOT NULL,
  vibe_tags TEXT[], -- Array of vibe keywords
  address TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_groups ON group_matches(group1_id, group2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_venues_neighborhood ON venues(neighborhood);
