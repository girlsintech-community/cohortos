-- Migration to add speaker metadata to the events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS speaker_name text,
ADD COLUMN IF NOT EXISTS speaker_designation text,
ADD COLUMN IF NOT EXISTS speaker_linkedin text,
ADD COLUMN IF NOT EXISTS speaker_bio text,
ADD COLUMN IF NOT EXISTS speaker_avatar_url text;
