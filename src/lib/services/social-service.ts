import { supabase } from '../supabase';
import type {
  SocialPost,
  PostComment,
  PostType,
  SocialAuthorSummary,
  CommunityLeaderboardEntry,
} from '@/types';

interface RawJoinedProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

function mapJoinedAuthor(raw: unknown): SocialAuthorSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = Array.isArray(raw) ? (raw[0] as RawJoinedProfile | undefined) : (raw as RawJoinedProfile);
  if (!p || !p.id) return undefined;
  return {
    id: p.id,
    username: p.username || 'player',
    displayName: p.display_name || 'Grinder',
    avatar: p.avatar_url || '',
  };
}

/**
 * Service for managing social posts, feed, kudos, leaderboard, and follows via Supabase.
 * Joins author metadata directly from `public.profiles` so author identity is always exact.
 */
export const socialService = {
  async fetchFeed(limit = 20, offset = 0): Promise<SocialPost[]> {
    const { data, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        author:profiles!social_posts_author_id_fkey ( id, username, display_name, avatar_url ),
        social_kudos ( user_id ),
        social_comments (
          id,
          author_id,
          content,
          created_at,
          author:profiles!social_comments_author_id_fkey ( id, username, display_name, avatar_url )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!data) return [];

    return data.map(d => ({
      id: d.id,
      authorId: d.author_id,
      author: mapJoinedAuthor(d.author),
      type: d.type as PostType,
      content: d.content,
      data: d.data || undefined,
      sessionData: d.session_data || undefined,
      isPublic: d.is_public,
      kudos: ((d.social_kudos as { user_id: string }[]) || []).map(k => k.user_id),
      comments: ((d.social_comments as Array<{
        id: string;
        author_id: string;
        content: string;
        created_at: string;
        author?: unknown;
      }>) || [])
        .map(c => ({
          id: c.id,
          authorId: c.author_id,
          author: mapJoinedAuthor(c.author),
          content: c.content,
          createdAt: c.created_at,
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      createdAt: d.created_at,
    }));
  },

  async createPost(userId: string, post: Omit<SocialPost, 'id' | 'createdAt' | 'kudos' | 'comments'>): Promise<SocialPost> {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        author_id: userId,
        type: post.type,
        content: post.content,
        data: post.data || null,
        session_data: post.sessionData || null,
        is_public: post.isPublic,
      })
      .select(`
        *,
        author:profiles!social_posts_author_id_fkey ( id, username, display_name, avatar_url )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorId: data.author_id,
      author: mapJoinedAuthor(data.author),
      type: data.type as PostType,
      content: data.content,
      data: data.data || undefined,
      sessionData: data.session_data || undefined,
      isPublic: data.is_public,
      kudos: [],
      comments: [],
      createdAt: data.created_at,
    };
  },

  async toggleKudos(userId: string, postId: string, isAdding: boolean): Promise<void> {
    if (isAdding) {
      const { error } = await supabase.from('social_kudos').insert({ post_id: postId, user_id: userId });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('social_kudos').delete().match({ post_id: postId, user_id: userId });
      if (error) throw error;
    }
  },

  async addComment(userId: string, postId: string, content: string): Promise<PostComment> {
    const { data, error } = await supabase
      .from('social_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content,
      })
      .select(`
        *,
        author:profiles!social_comments_author_id_fkey ( id, username, display_name, avatar_url )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorId: data.author_id,
      author: mapJoinedAuthor(data.author),
      content: data.content,
      createdAt: data.created_at,
    };
  },

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase.from('social_posts').delete().eq('id', postId);
    if (error) throw error;
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('social_comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  async fetchFollowing(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('social_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error || !data) return [];
    return data.map(d => d.following_id);
  },

  async fetchFollowersCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('social_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error || count === null) return 0;
    return count;
  },

  async followUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase.from('social_follows').insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
  },

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase.from('social_follows').delete().match({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
  },

  async fetchCommunityLeaderboard(): Promise<CommunityLeaderboardEntry[]> {
    const { data, error } = await supabase.rpc('get_community_leaderboard');
    if (error || !data) {
      if (error) console.error('Failed to fetch community leaderboard:', error);
      return [];
    }
    return (data as CommunityLeaderboardEntry[]).map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      avatar: row.avatar || '',
      sessionsLogged: Number(row.sessionsLogged || 0),
      mttsLogged: Number(row.mttsLogged || 0),
      netProfit: row.netProfit !== null && row.netProfit !== undefined ? Number(row.netProfit) : null,
      roi: row.roi !== null && row.roi !== undefined ? Number(row.roi) : null,
      kudosReceived: Number(row.kudosReceived || 0),
    }));
  },

  async fetchTrendingDiscussions(): Promise<{ postId: string; authorName: string; content: string; score: number }[]> {
    const { data, error } = await supabase.rpc('get_trending_discussions');
    if (error || !data) {
      return [];
    }
    return (data as Array<{ post_id: string; author_name: string; content: string; score: number }>).map(d => ({
      postId: d.post_id,
      authorName: d.author_name,
      content: d.content,
      score: d.score,
    }));
  },
};
