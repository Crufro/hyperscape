-- Migration: Add status tracking to preview_manifests
-- This allows tracking items from original manifests vs user drafts

-- Add status column
ALTER TABLE preview_manifests
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add comment
COMMENT ON COLUMN preview_manifests.status IS 'Item status: draft, pending_approval, approved, published';

-- Add is_original flag to track items loaded from original manifests
ALTER TABLE preview_manifests
ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN preview_manifests.is_original IS 'True if this manifest was seeded from original game manifests';

-- Add published_at timestamp
ALTER TABLE preview_manifests
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN preview_manifests.published_at IS 'When this manifest was published to production CDN';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_preview_manifests_status ON preview_manifests(status);

-- Create index for original flag
CREATE INDEX IF NOT EXISTS idx_preview_manifests_is_original ON preview_manifests(is_original);

-- Update existing preview manifests to draft status if not set
UPDATE preview_manifests
SET status = 'draft'
WHERE status IS NULL;
