-- Shist initial Prisma migration (safe-add)

-- Users: add is_premium
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- List participants: add role column
ALTER TABLE IF EXISTS list_participants
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'VIEWER';

-- Indexes for hot paths
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at);
CREATE INDEX IF NOT EXISTS idx_lists_creator_id ON lists (creator_id);
CREATE INDEX IF NOT EXISTS idx_lists_public_updated ON lists (is_public, updated_at);
CREATE INDEX IF NOT EXISTS idx_lists_updated_at ON lists (updated_at);
CREATE INDEX IF NOT EXISTS idx_list_participants_user ON list_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_list_participants_list ON list_participants (list_id);
CREATE INDEX IF NOT EXISTS idx_list_participants_role ON list_participants (role);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_added_by ON list_items (added_by_id);
CREATE INDEX IF NOT EXISTS idx_list_items_updated_at ON list_items (updated_at);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations (inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_email ON invitations (recipient_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invitations_token ON invitations (token);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio text,
  phone varchar(255)
);

-- Auth.js compatible tables (use custom names to avoid conflict with existing sessions)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(255) NOT NULL,
  provider varchar(255) NOT NULL,
  provider_account_id varchar(255) NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type varchar(255),
  scope text,
  id_token text,
  session_state text,
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

CREATE TABLE IF NOT EXISTS sessions_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token varchar(255) UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_auth_user_id ON sessions_auth(user_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier varchar(255) NOT NULL,
  token varchar(255) UNIQUE NOT NULL,
  expires timestamp NOT NULL,
  UNIQUE(identifier, token)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id varchar(255) UNIQUE NOT NULL,
  stripe_subscription_id varchar(255) UNIQUE,
  status varchar(50) NOT NULL,
  current_period_end timestamp,
  cancel_at_period_end boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Ad Preferences
CREATE TABLE IF NOT EXISTS ad_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_personalized boolean NOT NULL DEFAULT false,
  last_ad_shown_at timestamp
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(255) NOT NULL,
  entity_type varchar(255) NOT NULL,
  entity_id varchar(255) NOT NULL,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);