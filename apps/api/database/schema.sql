-- Asset Forge Database Schema
-- Comprehensive schema for all application features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp extension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  privy_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  wallet_address VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'member',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'team_leader', 'member'))
);

CREATE INDEX idx_users_privy_id ON users(privy_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);

-- =====================================================
-- ADMIN WHITELIST (REFERENCE ONLY)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_whitelist_wallet ON admin_whitelist(wallet_address);
CREATE INDEX idx_admin_whitelist_added_by ON admin_whitelist(added_by);

-- =====================================================
-- TEAMS & COLLABORATION
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT teams_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_teams_approval_status ON teams(approval_status);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined, expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);

-- =====================================================
-- PROJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =====================================================
-- 3D ASSETS
-- =====================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL, -- character, item, environment, equipment, etc.
  category VARCHAR(100),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- File storage
  file_url TEXT,
  file_size BIGINT,
  file_type VARCHAR(100),
  thumbnail_url TEXT,

  -- Generation metadata
  prompt TEXT,
  negative_prompt TEXT,
  model_used VARCHAR(255),
  generation_params JSONB DEFAULT '{}',

  -- Asset properties
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, processing, completed, failed, archived
  visibility VARCHAR(50) DEFAULT 'private', -- private, team, public

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_assets_owner ON assets(owner_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);

-- =====================================================
-- RIGGING & FITTING
-- =====================================================

CREATE TABLE IF NOT EXISTS rigging_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  rigging_type VARCHAR(100) NOT NULL, -- hand, full_body, equipment, armor
  bone_structure JSONB,
  constraints JSONB,
  animation_ready BOOLEAN DEFAULT false,
  validation_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rigging_asset ON rigging_metadata(asset_id);

CREATE TABLE IF NOT EXISTS fitting_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  fitting_type VARCHAR(100) NOT NULL, -- armor, equipment
  base_model VARCHAR(255),
  adjustments JSONB,
  mesh_data JSONB,
  status VARCHAR(50) DEFAULT 'in_progress',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_fitting_asset ON fitting_sessions(asset_id);

-- =====================================================
-- GAME CONTENT
-- =====================================================

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  objective TEXT,
  reward TEXT,
  difficulty VARCHAR(50),
  estimated_duration VARCHAR(100),

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Quest structure
  quest_type VARCHAR(100), -- main, side, daily, event
  prerequisites TEXT[],
  quest_chain_id UUID,
  quest_order INTEGER,

  -- Content
  dialogue JSONB,
  objectives JSONB,
  rewards JSONB,
  requirements JSONB,

  -- Game integration
  manifest_data JSONB,

  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_quests_owner ON quests(owner_id);
CREATE INDEX idx_quests_project ON quests(project_id);
CREATE INDEX idx_quests_type ON quests(quest_type);

CREATE TABLE IF NOT EXISTS npcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  personality TEXT,
  backstory TEXT,

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- NPC properties
  npc_type VARCHAR(100), -- merchant, quest_giver, enemy, friendly
  faction VARCHAR(255),
  level INTEGER,

  -- Appearance
  appearance JSONB,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Dialogue & behavior
  dialogue_tree JSONB,
  behavior_script JSONB,
  personality_traits JSONB,

  -- Voice
  voice_id VARCHAR(255),
  voice_settings JSONB,

  -- Game integration
  spawn_locations JSONB,
  loot_table JSONB,

  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_npcs_owner ON npcs(owner_id);
CREATE INDEX idx_npcs_project ON npcs(project_id);
CREATE INDEX idx_npcs_type ON npcs(npc_type);

CREATE TABLE IF NOT EXISTS lore_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Categorization
  category VARCHAR(100), -- history, character, location, item, event
  tags TEXT[],
  era VARCHAR(255),
  region VARCHAR(255),

  -- Relationships
  related_characters UUID[],
  related_locations UUID[],
  related_events UUID[],

  -- Content
  timeline_position INTEGER,
  importance_level INTEGER DEFAULT 5,

  metadata JSONB DEFAULT '{}',

  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lore_owner ON lore_entries(owner_id);
CREATE INDEX idx_lore_project ON lore_entries(project_id);
CREATE INDEX idx_lore_category ON lore_entries(category);
CREATE INDEX idx_lore_tags ON lore_entries USING GIN(tags);

CREATE TABLE IF NOT EXISTS npc_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  npc_id UUID REFERENCES npcs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Script content
  script_type VARCHAR(100), -- dialogue, behavior, combat, interaction
  script_content JSONB NOT NULL,
  conditions JSONB,
  triggers JSONB,

  -- Integration
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scripts_npc ON npc_scripts(npc_id);
CREATE INDEX idx_scripts_owner ON npc_scripts(owner_id);
CREATE INDEX idx_scripts_type ON npc_scripts(script_type);

-- =====================================================
-- VOICE GENERATION
-- =====================================================

CREATE TABLE IF NOT EXISTS voice_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,

  -- Generation parameters
  text_content TEXT NOT NULL,
  voice_model VARCHAR(255),
  voice_settings JSONB DEFAULT '{}',

  -- Output
  audio_url TEXT,
  audio_duration FLOAT,
  audio_format VARCHAR(50),
  file_size BIGINT,

  -- Metadata
  language VARCHAR(50) DEFAULT 'en',
  emotion VARCHAR(100),
  pitch FLOAT,
  speed FLOAT,

  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_voice_owner ON voice_generations(owner_id);
CREATE INDEX idx_voice_npc ON voice_generations(npc_id);
CREATE INDEX idx_voice_status ON voice_generations(status);

CREATE TABLE IF NOT EXISTS voice_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Manifest content
  voice_assignments JSONB NOT NULL,
  manifest_data JSONB,

  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_manifests_project ON voice_manifests(project_id);
CREATE INDEX idx_voice_manifests_owner ON voice_manifests(owner_id);

-- =====================================================
-- MANIFESTS & GAME DATA
-- =====================================================

CREATE TABLE IF NOT EXISTS game_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manifest_type VARCHAR(100) NOT NULL, -- item, npc, quest, location, etc.

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Manifest content
  manifest_data JSONB NOT NULL,
  schema_version VARCHAR(50),

  -- References
  asset_ids UUID[],
  dependencies JSONB,

  -- Publishing
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_manifests_project ON game_manifests(project_id);
CREATE INDEX idx_manifests_type ON game_manifests(manifest_type);
CREATE INDEX idx_manifests_owner ON game_manifests(owner_id);

-- Preview Manifests - User/Team working manifests before submission
CREATE TABLE IF NOT EXISTS preview_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Manifest type: items, npcs, lore, quests, music, voice, sound_effects, static_images, biomes, zones, world
  manifest_type VARCHAR(100) NOT NULL,

  -- Content data as JSONB array
  content JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure either user_id or team_id is set, not both
  CONSTRAINT preview_manifests_owner_check CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  ),
  -- Unique constraint: one preview manifest per type per owner
  CONSTRAINT preview_manifests_unique_type UNIQUE (user_id, team_id, manifest_type)
);

CREATE INDEX idx_preview_manifests_user ON preview_manifests(user_id);
CREATE INDEX idx_preview_manifests_team ON preview_manifests(team_id);
CREATE INDEX idx_preview_manifests_type ON preview_manifests(manifest_type);

-- Manifest Submissions - Individual items submitted for approval
CREATE TABLE IF NOT EXISTS manifest_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- What type and item is being submitted
  manifest_type VARCHAR(100) NOT NULL,
  item_id VARCHAR(255) NOT NULL, -- The id of the item being submitted
  item_data JSONB NOT NULL, -- Full item data

  -- Required assets for submission
  has_details BOOLEAN DEFAULT false,
  has_sprites BOOLEAN DEFAULT false,
  has_images BOOLEAN DEFAULT false,
  has_3d_model BOOLEAN DEFAULT false,

  -- Asset references
  sprite_urls TEXT[],
  image_urls TEXT[],
  model_url TEXT,

  -- Submission workflow
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, withdrawn
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Admin feedback
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Edited version (if admin made changes before approval)
  edited_item_data JSONB,
  was_edited BOOLEAN DEFAULT false,

  -- Version tracking
  submission_version INTEGER DEFAULT 1,
  parent_submission_id UUID REFERENCES manifest_submissions(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user ON manifest_submissions(user_id);
CREATE INDEX idx_submissions_team ON manifest_submissions(team_id);
CREATE INDEX idx_submissions_type ON manifest_submissions(manifest_type);
CREATE INDEX idx_submissions_status ON manifest_submissions(status);
CREATE INDEX idx_submissions_item ON manifest_submissions(manifest_type, item_id);
CREATE INDEX idx_submissions_reviewed_by ON manifest_submissions(reviewed_by);

-- AI Context Preferences - Controls what manifests AI can access for context
CREATE TABLE IF NOT EXISTS ai_context_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Context source toggles
  use_own_preview BOOLEAN DEFAULT true,
  use_cdn_content BOOLEAN DEFAULT true,
  use_team_preview BOOLEAN DEFAULT true,
  use_all_submissions BOOLEAN DEFAULT false,

  -- Additional settings
  max_context_items INTEGER DEFAULT 100,
  prefer_recent BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_context_user ON ai_context_preferences(user_id);

-- Manifest Versions - Version control for all manifest changes
CREATE TABLE IF NOT EXISTS manifest_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to entity being versioned
  entity_type VARCHAR(100) NOT NULL, -- preview_manifest, submission, cdn_manifest
  entity_id UUID NOT NULL,

  -- Version metadata
  version_number INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL, -- created, updated, deleted, approved, rejected

  -- Version snapshot
  data_snapshot JSONB NOT NULL,

  -- Change details
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  diff_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_versions_entity ON manifest_versions(entity_type, entity_id);
CREATE INDEX idx_versions_changed_by ON manifest_versions(changed_by);
CREATE INDEX idx_versions_created ON manifest_versions(created_at DESC);

-- =====================================================
-- QUEST TRACKING & PLAYTEST
-- =====================================================

CREATE TABLE IF NOT EXISTS quest_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Session data
  session_type VARCHAR(50) DEFAULT 'manual', -- manual, ai, automated
  agent_name VARCHAR(255),

  -- Progress
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, failed, abandoned
  current_objective INTEGER DEFAULT 0,
  progress_data JSONB,

  -- Metrics
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Feedback
  bugs_found JSONB,
  feedback TEXT,
  completion_rate FLOAT,
  difficulty_rating INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quest_tracking_quest ON quest_tracking_sessions(quest_id);
CREATE INDEX idx_quest_tracking_tester ON quest_tracking_sessions(tester_id);

CREATE TABLE IF NOT EXISTS ai_playtesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Agent configuration
  agent_type VARCHAR(100), -- explorer, completionist, speedrunner, breaker
  personality JSONB,
  testing_focus TEXT[],

  -- Performance
  tests_run INTEGER DEFAULT 0,
  bugs_found INTEGER DEFAULT 0,
  average_completion_rate FLOAT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_playtesters_project ON ai_playtesters(project_id);
CREATE INDEX idx_playtesters_owner ON ai_playtesters(owner_id);

-- =====================================================
-- RELATIONSHIPS & COLLABORATION
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_a_type VARCHAR(100) NOT NULL, -- quest, npc, lore, asset, etc.
  entity_a_id UUID NOT NULL,
  entity_b_type VARCHAR(100) NOT NULL,
  entity_b_id UUID NOT NULL,
  relationship_type VARCHAR(100) NOT NULL, -- requires, mentions, located_at, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_relationships_a ON entity_relationships(entity_a_type, entity_a_id);
CREATE INDEX idx_relationships_b ON entity_relationships(entity_b_type, entity_b_id);
CREATE INDEX idx_relationships_type ON entity_relationships(relationship_type);

-- =====================================================
-- ACTIVITY & AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, published, etc.
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_action ON activity_log(action);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- STORAGE & FILES
-- =====================================================

CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(255),
  file_type VARCHAR(100), -- asset, thumbnail, audio, document
  entity_type VARCHAR(100),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_user ON file_uploads(user_id);
CREATE INDEX idx_files_entity ON file_uploads(entity_type, entity_id);

-- =====================================================
-- API KEYS & INTEGRATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  permissions TEXT[],
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT api_keys_owner_check CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_team ON api_keys(team_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_whitelist_updated_at BEFORE UPDATE ON admin_whitelist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rigging_updated_at BEFORE UPDATE ON rigging_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_npcs_updated_at BEFORE UPDATE ON npcs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lore_updated_at BEFORE UPDATE ON lore_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON npc_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_manifests_updated_at BEFORE UPDATE ON voice_manifests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_manifests_updated_at BEFORE UPDATE ON game_manifests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playtesters_updated_at BEFORE UPDATE ON ai_playtesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
