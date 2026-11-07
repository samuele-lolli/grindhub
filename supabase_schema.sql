-- ============================================================
-- GrindHub Supabase Schema, Indexes, Triggers, RLS & RPCs
-- Execute this entirely in the Supabase SQL Editor
-- ============================================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  years_playing INTEGER DEFAULT 0 CHECK (years_playing >= 0 AND years_playing <= 100),
  primary_game_type TEXT DEFAULT 'mtt',
  preferred_stakes TEXT,
  platforms TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  privacy JSONB DEFAULT '{"showProfit": true, "showROI": true, "showITM": true, "showVolume": true, "showAvgBuyIn": true, "showHourlyRate": true, "showBiggestWin": true, "showCurrentStreak": true, "autoShareGoals": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  platforms TEXT[] NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  event_count INTEGER NOT NULL CHECK (event_count > 0),
  cashes_count INTEGER NOT NULL CHECK (cashes_count >= 0 AND cashes_count <= event_count),
  total_buy_ins NUMERIC NOT NULL CHECK (total_buy_ins >= 0),
  total_cashes NUMERIC NOT NULL CHECK (total_cashes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankroll_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT NOT NULL DEFAULT 'poker_room',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES bankroll_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  current_value NUMERIC NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  data JSONB,
  session_data JSONB,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_kudos (
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS social_follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Safe migrations for existing installations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS data JSONB;

-- 1b. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bankroll_accounts_user ON bankroll_accounts(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_bankroll_tx_user_date ON bankroll_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bankroll_tx_account ON bankroll_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_social_follows_following ON social_follows(following_id);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_follows ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions
DROP POLICY IF EXISTS "Users can view their own sessions." ON sessions;
CREATE POLICY "Users can view their own sessions." ON sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own sessions." ON sessions;
CREATE POLICY "Users can insert their own sessions." ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own sessions." ON sessions;
CREATE POLICY "Users can update their own sessions." ON sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sessions." ON sessions;
CREATE POLICY "Users can delete their own sessions." ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Bankroll Accounts
DROP POLICY IF EXISTS "Users can view their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can view their own accounts." ON bankroll_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can insert their own accounts." ON bankroll_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can update their own accounts." ON bankroll_accounts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can delete their own accounts." ON bankroll_accounts FOR DELETE USING (auth.uid() = user_id);

-- Bankroll Transactions
DROP POLICY IF EXISTS "Users can view their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can view their own transactions." ON bankroll_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can insert their own transactions." ON bankroll_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can update their own transactions." ON bankroll_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can delete their own transactions." ON bankroll_transactions FOR DELETE USING (auth.uid() = user_id);

-- Goals
DROP POLICY IF EXISTS "Users can view their own goals." ON goals;
CREATE POLICY "Users can view their own goals." ON goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own goals." ON goals;
CREATE POLICY "Users can insert their own goals." ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own goals." ON goals;
CREATE POLICY "Users can update their own goals." ON goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own goals." ON goals;
CREATE POLICY "Users can delete their own goals." ON goals FOR DELETE USING (auth.uid() = user_id);

-- Social Posts
DROP POLICY IF EXISTS "Public posts are viewable by everyone." ON social_posts;
CREATE POLICY "Public posts are viewable by everyone." ON social_posts FOR SELECT USING (is_public = true OR auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can insert their own posts." ON social_posts;
CREATE POLICY "Users can insert their own posts." ON social_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update their own posts." ON social_posts;
CREATE POLICY "Users can update their own posts." ON social_posts FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete their own posts." ON social_posts;
CREATE POLICY "Users can delete their own posts." ON social_posts FOR DELETE USING (auth.uid() = author_id);

-- Social Comments
DROP POLICY IF EXISTS "Comments are viewable by everyone." ON social_comments;
CREATE POLICY "Comments are viewable by everyone." ON social_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM social_posts sp WHERE sp.id = post_id AND (sp.is_public = true OR sp.author_id = auth.uid()))
);
DROP POLICY IF EXISTS "Users can insert their own comments." ON social_comments;
CREATE POLICY "Users can insert their own comments." ON social_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update their own comments." ON social_comments;
CREATE POLICY "Users can update their own comments." ON social_comments FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete their own comments." ON social_comments;
CREATE POLICY "Users can delete their own comments." ON social_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM social_posts sp WHERE sp.id = post_id AND sp.author_id = auth.uid())
);

-- Social Kudos
DROP POLICY IF EXISTS "Kudos are viewable by everyone." ON social_kudos;
CREATE POLICY "Kudos are viewable by everyone." ON social_kudos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own kudos." ON social_kudos;
CREATE POLICY "Users can insert their own kudos." ON social_kudos FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own kudos." ON social_kudos;
CREATE POLICY "Users can delete their own kudos." ON social_kudos FOR DELETE USING (auth.uid() = user_id);

-- Social Follows
DROP POLICY IF EXISTS "Follows are viewable by everyone." ON social_follows;
CREATE POLICY "Follows are viewable by everyone." ON social_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own follows." ON social_follows;
CREATE POLICY "Users can insert their own follows." ON social_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can delete their own follows." ON social_follows;
CREATE POLICY "Users can delete their own follows." ON social_follows FOR DELETE USING (auth.uid() = follower_id);

-- 4. Setup Auth Triggers (Auto-create profile on signup, collision-safe on username)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'player'),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if base_username = '' then
    base_username := 'player';
  end if;

  final_username := base_username;
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'Player')),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 5. RPC Functions
-- ============================================================

-- Atomically update a bankroll account balance by a delta amount.
-- Enforces ownership check (user_id = auth.uid()) to prevent unauthorized balance tampering.
create or replace function public.update_account_balance(
  p_account_id UUID,
  p_delta NUMERIC
)
returns NUMERIC
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance NUMERIC;
begin
  update bankroll_accounts
  set balance = balance + p_delta,
      updated_at = now()
  where id = p_account_id
    and user_id = auth.uid()
  returning balance into new_balance;

  if not found then
    raise exception 'Account % not found or unauthorized', p_account_id;
  end if;

  return new_balance;
end;
$$;

-- Retrieve aggregated session stats for a player, respecting their privacy settings.
-- Returns NULL for any stat the player has hidden via their privacy JSONB column.
create or replace function public.get_player_public_stats(target_user_id UUID)
returns JSONB
language plpgsql
security definer set search_path = public
as $$
declare
  privacy_settings JSONB;
  result JSONB;
  total_sessions INTEGER;
  total_tournaments INTEGER;
  total_buy_ins NUMERIC;
  total_cashes NUMERIC;
  total_duration INTEGER;
  biggest_win NUMERIC;
  cashes_count_total INTEGER;
begin
  -- Fetch the player's privacy settings
  select privacy into privacy_settings
  from profiles
  where id = target_user_id;

  if privacy_settings is null then
    return null;
  end if;

  -- Aggregate session stats
  select
    count(*)::INTEGER,
    coalesce(sum(event_count), 0)::INTEGER,
    coalesce(sum(total_buy_ins), 0),
    coalesce(sum(total_cashes), 0),
    coalesce(sum(duration), 0)::INTEGER,
    coalesce(max(total_cashes - total_buy_ins), 0),
    coalesce(sum(cashes_count), 0)::INTEGER
  into
    total_sessions,
    total_tournaments,
    total_buy_ins,
    total_cashes,
    total_duration,
    biggest_win,
    cashes_count_total
  from sessions
  where user_id = target_user_id;

  result := jsonb_build_object(
    'totalSessions', case when coalesce((privacy_settings->>'showVolume')::boolean, true) then total_sessions else null end,
    'totalTournaments', case when coalesce((privacy_settings->>'showVolume')::boolean, true) then total_tournaments else null end,
    'totalProfit', case when coalesce((privacy_settings->>'showProfit')::boolean, true) then (total_cashes - total_buy_ins) else null end,
    'roi', case when coalesce((privacy_settings->>'showROI')::boolean, true) and total_buy_ins > 0 then round(((total_cashes - total_buy_ins) / total_buy_ins * 100)::numeric, 2) else null end,
    'itm', case when coalesce((privacy_settings->>'showITM')::boolean, true) and total_tournaments > 0 then round((cashes_count_total::numeric / total_tournaments * 100)::numeric, 2) else null end,
    'avgBuyIn', case when coalesce((privacy_settings->>'showAvgBuyIn')::boolean, true) and total_tournaments > 0 then round((total_buy_ins / total_tournaments)::numeric, 2) else null end,
    'hourlyRate', case when coalesce((privacy_settings->>'showHourlyRate')::boolean, true) and total_duration > 0 then round(((total_cashes - total_buy_ins) / (total_duration::numeric / 60))::numeric, 2) else null end,
    'biggestWin', case when coalesce((privacy_settings->>'showBiggestWin')::boolean, true) then biggest_win else null end,
    'currentStreak', null
  );

  return result;
end;
$$;

-- Fetch trending social discussions from the last 7 days.
-- Scores posts by engagement: kudos count + (comments count * 2).
-- Returns top 10 most engaged posts with author info.
create or replace function public.get_trending_discussions()
returns TABLE(post_id UUID, author_name TEXT, content TEXT, score BIGINT)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    sp.id as post_id,
    p.display_name as author_name,
    sp.content,
    (
      (select count(*) from social_kudos sk where sk.post_id = sp.id) +
      (select count(*) * 2 from social_comments sc where sc.post_id = sp.id)
    ) as score
  from social_posts sp
  join profiles p on p.id = sp.author_id
  where sp.is_public = true
    and sp.created_at >= now() - interval '7 days'
  order by score desc
  limit 10;
end;
$$;
