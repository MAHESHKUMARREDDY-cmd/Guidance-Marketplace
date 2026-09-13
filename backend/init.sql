-- Phase 1 schema: auth, guide profiles, sessions, encrypted messages
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('client', 'guide', 'both', 'admin');
CREATE TYPE vertical_type AS ENUM ('finance', 'career', 'emotional', 'companionship');
CREATE TYPE verification_tier AS ENUM ('basic', 'verified', 'pro');
CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled', 'disputed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  verification_tier verification_tier NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guide_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vertical vertical_type NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  bio TEXT,
  credentials_json JSONB DEFAULT '{}',
  avg_rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES users(id),
  client_id UUID NOT NULL REFERENCES users(id),
  vertical vertical_type NOT NULL,
  status session_status NOT NULL DEFAULT 'active',
  rate_snapshot NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Messages are stored encrypted at rest (AES-256-GCM). See backend/src/utils/crypto.js
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  guide_id UUID NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_guide_profiles_vertical ON guide_profiles(vertical);
CREATE INDEX idx_sessions_guide ON sessions(guide_id);
CREATE INDEX idx_sessions_client ON sessions(client_id);
