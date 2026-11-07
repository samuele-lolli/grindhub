-- ============================================================
-- GrindHub Production Schema (PostgreSQL 17 / Supabase)
-- Synchronized 1:1 with live project flreusotdfnybdsvtnop
-- ============================================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30 AND username ~ '^[a-zA-Z0-9_]+$'),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  years_playing INTEGER DEFAULT 0 CHECK (years_playing >= 0 AND years_playing <= 100),
  primary_game_type TEXT DEFAULT 'mtt',
  preferred_stakes TEXT,
  platforms TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  demo_status TEXT NOT NULL DEFAULT 'uninitialized' CHECK (demo_status IN ('uninitialized', 'active', 'cleared')),
  privacy JSONB DEFAULT '{"showProfit": true, "showROI": true, "showITM": true, "showVolume": true, "showAvgBuyIn": true, "showHourlyRate": true, "showBiggestWin": true, "showCurrentStreak": true, "autoShareGoals": false}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{"currency": "EUR", "locale": "it", "theme": "dark", "defaultPlatform": "pokerstars", "autoShareSessions": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  platforms TEXT[] NOT NULL,
  duration INTEGER NOT NULL CHECK (duration >= 0),
  event_count INTEGER NOT NULL CHECK (event_count >= 1),
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
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP')),
  category TEXT NOT NULL DEFAULT 'poker_room' CHECK (category IN ('poker_room', 'e_wallet', 'crypto', 'bank_account', 'cash')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bankroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES bankroll_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'session_result', 'transfer')),
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
  type TEXT NOT NULL CHECK (type IN ('volume', 'time', 'sessions', 'hours', 'profit', 'roi', 'tournaments', 'custom', 'bankroll')),
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  current_value NUMERIC NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('session_result', 'milestone', 'goal_completed', 'text')),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
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
  CONSTRAINT chk_social_follows_no_self CHECK (follower_id <> following_id)
);

-- 1b. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bankroll_accounts_user_id ON bankroll_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bankroll_tx_user_date ON bankroll_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bankroll_transactions_account_id ON bankroll_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_id ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_post_id ON social_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_author_id ON social_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_social_kudos_post_id ON social_kudos(post_id);
CREATE INDEX IF NOT EXISTS idx_social_kudos_user_id ON social_kudos(user_id);
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

-- 3. RLS Policies (Optimized with TO authenticated and (SELECT auth.uid()))

-- Profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles viewable by authenticated users" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- Sessions
DROP POLICY IF EXISTS "Users can view their own sessions." ON sessions;
CREATE POLICY "Users can view their own sessions." ON sessions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own sessions." ON sessions;
CREATE POLICY "Users can insert their own sessions." ON sessions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own sessions." ON sessions;
CREATE POLICY "Users can update their own sessions." ON sessions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own sessions." ON sessions;
CREATE POLICY "Users can delete their own sessions." ON sessions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Bankroll Accounts
DROP POLICY IF EXISTS "Users can view their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can view their own accounts." ON bankroll_accounts FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can insert their own accounts." ON bankroll_accounts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can update their own accounts." ON bankroll_accounts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own accounts." ON bankroll_accounts;
CREATE POLICY "Users can delete their own accounts." ON bankroll_accounts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Bankroll Transactions (enforces ownership of both row and target account_id)
DROP POLICY IF EXISTS "Users can view their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can view their own transactions." ON bankroll_transactions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can insert their own transactions." ON bankroll_transactions FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.bankroll_accounts a WHERE a.id = account_id AND a.user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "Users can update their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can update their own transactions." ON bankroll_transactions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.bankroll_accounts a WHERE a.id = account_id AND a.user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "Users can delete their own transactions." ON bankroll_transactions;
CREATE POLICY "Users can delete their own transactions." ON bankroll_transactions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Goals
DROP POLICY IF EXISTS "Users can view their own goals." ON goals;
CREATE POLICY "Users can view their own goals." ON goals FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own goals." ON goals;
CREATE POLICY "Users can insert their own goals." ON goals FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own goals." ON goals;
CREATE POLICY "Users can update their own goals." ON goals FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own goals." ON goals;
CREATE POLICY "Users can delete their own goals." ON goals FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Social Posts
DROP POLICY IF EXISTS "Public posts viewable by authenticated" ON social_posts;
CREATE POLICY "Public posts viewable by authenticated" ON social_posts FOR SELECT TO authenticated USING (is_public = true OR (SELECT auth.uid()) = author_id);
DROP POLICY IF EXISTS "Users can insert their own posts." ON social_posts;
CREATE POLICY "Users can insert their own posts." ON social_posts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = author_id);
DROP POLICY IF EXISTS "Users can update their own posts." ON social_posts;
CREATE POLICY "Users can update their own posts." ON social_posts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = author_id) WITH CHECK ((SELECT auth.uid()) = author_id);
DROP POLICY IF EXISTS "Users can delete their own posts." ON social_posts;
CREATE POLICY "Users can delete their own posts." ON social_posts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = author_id);

-- Social Comments (verified against parent post visibility)
DROP POLICY IF EXISTS "Comments viewable by authenticated" ON social_comments;
CREATE POLICY "Comments viewable by authenticated" ON social_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = social_comments.post_id AND (sp.is_public = true OR sp.author_id = (SELECT auth.uid())))
);
DROP POLICY IF EXISTS "Users can insert their own comments." ON social_comments;
CREATE POLICY "Users can insert their own comments." ON social_comments FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = author_id
  AND EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = social_comments.post_id AND (sp.is_public = true OR sp.author_id = (SELECT auth.uid())))
);
DROP POLICY IF EXISTS "Users can update their own comments." ON social_comments;
CREATE POLICY "Users can update their own comments." ON social_comments FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = author_id) WITH CHECK ((SELECT auth.uid()) = author_id);
DROP POLICY IF EXISTS "Users can delete their own comments." ON social_comments;
CREATE POLICY "Users can delete their own comments." ON social_comments FOR DELETE TO authenticated USING (
  (SELECT auth.uid()) = author_id OR EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = post_id AND sp.author_id = (SELECT auth.uid()))
);

-- Social Kudos (verified against parent post visibility)
DROP POLICY IF EXISTS "Kudos viewable by authenticated" ON social_kudos;
CREATE POLICY "Kudos viewable by authenticated" ON social_kudos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = social_kudos.post_id AND (sp.is_public = true OR sp.author_id = (SELECT auth.uid())))
);
DROP POLICY IF EXISTS "Users can insert their own kudos." ON social_kudos;
CREATE POLICY "Users can insert their own kudos." ON social_kudos FOR INSERT TO authenticated WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.id = social_kudos.post_id AND (sp.is_public = true OR sp.author_id = (SELECT auth.uid())))
);
DROP POLICY IF EXISTS "Users can delete their own kudos." ON social_kudos;
CREATE POLICY "Users can delete their own kudos." ON social_kudos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Social Follows
DROP POLICY IF EXISTS "Follows viewable by authenticated" ON social_follows;
CREATE POLICY "Follows viewable by authenticated" ON social_follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert their own follows." ON social_follows;
CREATE POLICY "Users can insert their own follows." ON social_follows FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = follower_id);
DROP POLICY IF EXISTS "Users can delete their own follows." ON social_follows;
CREATE POLICY "Users can delete their own follows." ON social_follows FOR DELETE TO authenticated USING ((SELECT auth.uid()) = follower_id);

-- 4. Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'player'),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  IF char_length(base_username) < 3 THEN
    base_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 4);
  END IF;
  base_username := substr(base_username, 1, 22);

  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1), 'Player')),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 5. Transactional & Privacy-Aware RPC Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_account_balance(
  p_account_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.bankroll_accounts
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE id = p_account_id
    AND user_id = (SELECT auth.uid())
  RETURNING balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % not found or unauthorized', p_account_id;
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_account_balance(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_account_balance(UUID, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_bankroll_transaction(
  p_account_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_delta NUMERIC;
  v_stored_amount NUMERIC;
  v_tx public.bankroll_transactions%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_type = 'withdrawal' THEN
    v_delta := -abs(p_amount);
    v_stored_amount := abs(p_amount);
  ELSIF p_type = 'deposit' THEN
    v_delta := abs(p_amount);
    v_stored_amount := abs(p_amount);
  ELSE
    v_delta := p_amount;
    v_stored_amount := p_amount;
  END IF;

  UPDATE public.bankroll_accounts
  SET balance = balance + v_delta,
      updated_at = now()
  WHERE id = p_account_id AND user_id = v_uid
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % not found or unauthorized', p_account_id;
  END IF;

  INSERT INTO public.bankroll_transactions (user_id, account_id, type, amount, date, notes)
  VALUES (v_uid, p_account_id, p_type, v_stored_amount, p_date, p_notes)
  RETURNING * INTO v_tx;

  RETURN jsonb_build_object(
    'transaction', row_to_json(v_tx)::jsonb,
    'newBalance', v_new_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_bankroll_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_abs NUMERIC := abs(p_amount);
  v_tid UUID := gen_random_uuid();
  v_from_name TEXT;
  v_to_name TEXT;
  v_from_bal NUMERIC;
  v_to_bal NUMERIC;
  v_out_tx public.bankroll_transactions%ROWTYPE;
  v_in_tx public.bankroll_transactions%ROWTYPE;
  v_suffix TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must differ';
  END IF;
  IF v_abs <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  SELECT name INTO v_from_name FROM public.bankroll_accounts WHERE id = p_from_account_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source account not found or unauthorized'; END IF;

  SELECT name INTO v_to_name FROM public.bankroll_accounts WHERE id = p_to_account_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination account not found or unauthorized'; END IF;

  UPDATE public.bankroll_accounts SET balance = balance - v_abs, updated_at = now()
  WHERE id = p_from_account_id AND user_id = v_uid RETURNING balance INTO v_from_bal;

  UPDATE public.bankroll_accounts SET balance = balance + v_abs, updated_at = now()
  WHERE id = p_to_account_id AND user_id = v_uid RETURNING balance INTO v_to_bal;

  v_suffix := CASE WHEN COALESCE(btrim(p_notes), '') <> '' THEN ' — ' || btrim(p_notes) ELSE '' END;

  INSERT INTO public.bankroll_transactions (user_id, account_id, type, amount, date, notes)
  VALUES (v_uid, p_from_account_id, 'transfer', -v_abs, p_date, '[tid:' || v_tid::text || '] Transfer to ' || v_to_name || v_suffix)
  RETURNING * INTO v_out_tx;

  INSERT INTO public.bankroll_transactions (user_id, account_id, type, amount, date, notes)
  VALUES (v_uid, p_to_account_id, 'transfer', v_abs, p_date, '[tid:' || v_tid::text || '] Transfer from ' || v_from_name || v_suffix)
  RETURNING * INTO v_in_tx;

  RETURN jsonb_build_object(
    'outTx', row_to_json(v_out_tx)::jsonb,
    'inTx', row_to_json(v_in_tx)::jsonb,
    'fromBalance', v_from_bal,
    'toBalance', v_to_bal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_user_account_balances()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.bankroll_accounts a
  SET balance = COALESCE((
    SELECT SUM(
      CASE
        WHEN t.type = 'withdrawal' THEN -abs(t.amount)
        WHEN t.type = 'deposit' THEN abs(t.amount)
        ELSE t.amount
      END
    )
    FROM public.bankroll_transactions t
    WHERE t.account_id = a.id AND t.user_id = v_uid
  ), 0),
  updated_at = now()
  WHERE a.user_id = v_uid;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', a.id, 'balance', a.balance))
    FROM public.bankroll_accounts a
    WHERE a.user_id = v_uid
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_player_public_stats(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
  v_privacy JSONB;
  v_demo_status TEXT;
  v_total_profit NUMERIC := 0;
  v_total_buy_ins NUMERIC := 0;
  v_total_cashes NUMERIC := 0;
  v_total_sessions INT := 0;
  v_total_tournaments INT := 0;
  v_cashes_count INT := 0;
  v_total_minutes INT := 0;
  v_biggest_win NUMERIC := 0;
  v_roi NUMERIC := 0;
  v_itm NUMERIC := 0;
  v_avg_buy_in NUMERIC := 0;
  v_hourly_rate NUMERIC := 0;
  v_current_streak INT := 0;
  v_streak_dir INT := 0;
  v_first BOOLEAN := true;
  v_rec RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT privacy, demo_status INTO v_privacy, v_demo_status
  FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_demo_status = 'active' AND target_user_id <> v_caller THEN
    RETURN json_build_object(
      'totalProfit', NULL, 'roi', NULL, 'itm', NULL,
      'totalSessions', 0, 'totalTournaments', 0,
      'avgBuyIn', NULL, 'hourlyRate', NULL, 'biggestWin', NULL, 'currentStreak', NULL
    );
  END IF;

  SELECT
    COUNT(*), COALESCE(SUM(event_count), 0), COALESCE(SUM(cashes_count), 0),
    COALESCE(SUM(total_buy_ins), 0), COALESCE(SUM(total_cashes), 0),
    COALESCE(SUM(total_cashes - total_buy_ins), 0), COALESCE(SUM(duration), 0),
    COALESCE(MAX(total_cashes - total_buy_ins), 0)
  INTO
    v_total_sessions, v_total_tournaments, v_cashes_count,
    v_total_buy_ins, v_total_cashes, v_total_profit, v_total_minutes, v_biggest_win
  FROM public.sessions WHERE user_id = target_user_id;

  FOR v_rec IN
    SELECT (total_cashes - total_buy_ins) AS profit
    FROM public.sessions WHERE user_id = target_user_id
    ORDER BY date DESC, created_at DESC
  LOOP
    IF v_first THEN
      v_first := false;
      IF v_rec.profit > 0 THEN v_streak_dir := 1; v_current_streak := 1;
      ELSIF v_rec.profit < 0 THEN v_streak_dir := -1; v_current_streak := -1;
      ELSE EXIT; END IF;
    ELSE
      IF v_streak_dir = 1 AND v_rec.profit > 0 THEN v_current_streak := v_current_streak + 1;
      ELSIF v_streak_dir = -1 AND v_rec.profit < 0 THEN v_current_streak := v_current_streak - 1;
      ELSE EXIT; END IF;
    END IF;
  END LOOP;

  IF v_total_buy_ins > 0 THEN v_roi := ROUND(((v_total_profit / v_total_buy_ins) * 100)::NUMERIC, 2); END IF;
  IF v_total_tournaments > 0 THEN
    v_itm := ROUND(((v_cashes_count::NUMERIC / v_total_tournaments::NUMERIC) * 100)::NUMERIC, 2);
    v_avg_buy_in := ROUND((v_total_buy_ins / v_total_tournaments)::NUMERIC, 2);
  END IF;
  IF v_total_minutes > 0 THEN v_hourly_rate := ROUND((v_total_profit / (v_total_minutes::NUMERIC / 60.0))::NUMERIC, 2); END IF;

  RETURN json_build_object(
    'totalProfit', CASE WHEN COALESCE((v_privacy->>'showProfit')::BOOLEAN, false) THEN v_total_profit ELSE NULL END,
    'roi', CASE WHEN COALESCE((v_privacy->>'showROI')::BOOLEAN, true) THEN v_roi ELSE NULL END,
    'itm', CASE WHEN COALESCE((v_privacy->>'showITM')::BOOLEAN, true) THEN v_itm ELSE NULL END,
    'totalSessions', CASE WHEN COALESCE((v_privacy->>'showVolume')::BOOLEAN, true) THEN v_total_sessions ELSE NULL END,
    'totalTournaments', CASE WHEN COALESCE((v_privacy->>'showVolume')::BOOLEAN, true) THEN v_total_tournaments ELSE NULL END,
    'avgBuyIn', CASE WHEN COALESCE((v_privacy->>'showAvgBuyIn')::BOOLEAN, false) THEN v_avg_buy_in ELSE NULL END,
    'hourlyRate', CASE WHEN COALESCE((v_privacy->>'showHourlyRate')::BOOLEAN, false) THEN v_hourly_rate ELSE NULL END,
    'biggestWin', CASE WHEN COALESCE((v_privacy->>'showBiggestWin')::BOOLEAN, false) THEN v_biggest_win ELSE NULL END,
    'currentStreak', CASE WHEN COALESCE((v_privacy->>'showCurrentStreak')::BOOLEAN, true) THEN v_current_streak ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_public_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_player_public_stats(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_community_leaderboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT
        pr.id,
        pr.display_name AS name,
        pr.username,
        pr.avatar_url AS avatar,
        COUNT(s.id)::int AS "sessionsLogged",
        COALESCE(SUM(s.event_count), 0)::int AS "mttsLogged",
        CASE
          WHEN COALESCE((pr.privacy->>'showProfit')::boolean, false)
          THEN COALESCE(SUM(s.total_cashes - s.total_buy_ins), 0)
          ELSE NULL
        END AS "netProfit",
        CASE
          WHEN COALESCE((pr.privacy->>'showROI')::boolean, true) AND COALESCE(SUM(s.total_buy_ins), 0) > 0
          THEN ROUND(((SUM(s.total_cashes - s.total_buy_ins) / SUM(s.total_buy_ins)) * 100)::numeric, 1)
          ELSE NULL
        END AS roi,
        (
          SELECT COUNT(*)::int
          FROM public.social_kudos k
          JOIN public.social_posts sp ON sp.id = k.post_id
          WHERE sp.author_id = pr.id
        ) AS "kudosReceived"
      FROM public.profiles pr
      LEFT JOIN public.sessions s ON s.user_id = pr.id
      WHERE pr.demo_status <> 'active'
        AND COALESCE((pr.privacy->>'showVolume')::boolean, true) = true
      GROUP BY pr.id, pr.display_name, pr.username, pr.avatar_url, pr.privacy
      HAVING COUNT(s.id) > 0
      ORDER BY COALESCE(SUM(s.event_count), 0) DESC, "kudosReceived" DESC
      LIMIT 10
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_community_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_leaderboard() TO authenticated;
