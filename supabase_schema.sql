-- ============================================================
-- GrindHub Supabase Schema & RLS Policies
-- Execute this entirely in the Supabase SQL Editor
-- ============================================================

-- 1. Create Tables

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  years_playing INTEGER,
  primary_game_type TEXT,
  preferred_stakes TEXT,
  platforms TEXT[],
  privacy JSONB DEFAULT '{"showProfit": true, "showROI": true, "showITM": true, "showVolume": true, "showAvgBuyIn": true, "showHourlyRate": true, "showBiggestWin": true, "showCurrentStreak": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  platforms TEXT[] NOT NULL,
  duration INTEGER NOT NULL,
  event_count INTEGER NOT NULL,
  cashes_count INTEGER NOT NULL,
  total_buy_ins NUMERIC NOT NULL,
  total_cashes NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bankroll_accounts (
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

CREATE TABLE bankroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES bankroll_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  session_data JSONB,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_kudos (
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE social_follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

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
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions
CREATE POLICY "Users can view their own sessions." ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions." ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions." ON sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions." ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Bankroll Accounts
CREATE POLICY "Users can view their own accounts." ON bankroll_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts." ON bankroll_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts." ON bankroll_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts." ON bankroll_accounts FOR DELETE USING (auth.uid() = user_id);

-- Bankroll Transactions
CREATE POLICY "Users can view their own transactions." ON bankroll_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions." ON bankroll_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions." ON bankroll_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions." ON bankroll_transactions FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can view their own goals." ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals." ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals." ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals." ON goals FOR DELETE USING (auth.uid() = user_id);

-- Social Posts
CREATE POLICY "Public posts are viewable by everyone." ON social_posts FOR SELECT USING (is_public = true OR auth.uid() = author_id);
CREATE POLICY "Users can insert their own posts." ON social_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own posts." ON social_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own posts." ON social_posts FOR DELETE USING (auth.uid() = author_id);

-- Social Comments
CREATE POLICY "Comments are viewable by everyone." ON social_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments." ON social_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own comments." ON social_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own comments." ON social_comments FOR DELETE USING (auth.uid() = author_id);

-- Social Kudos
CREATE POLICY "Kudos are viewable by everyone." ON social_kudos FOR SELECT USING (true);
CREATE POLICY "Users can insert their own kudos." ON social_kudos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own kudos." ON social_kudos FOR DELETE USING (auth.uid() = user_id);

-- Social Follows
CREATE POLICY "Follows are viewable by everyone." ON social_follows FOR SELECT USING (true);
CREATE POLICY "Users can insert their own follows." ON social_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete their own follows." ON social_follows FOR DELETE USING (auth.uid() = follower_id);

-- 4. Setup Auth Triggers (Auto-create profile on signup)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1))),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
