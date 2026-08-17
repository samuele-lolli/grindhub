import { supabase } from '../supabase';
import type { SocialPost, PostComment, PostType } from '@/types';

/**
 * Service for managing social posts, feed, kudos, and follows via Supabase.
 */
export const socialService = {
  /**
   * Retrieves the global or personalized social feed.
   * @returns A promise resolving to an array of SocialPost objects.
   */
  async fetchFeed(): Promise<SocialPost[]> {
    const { data, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_kudos ( user_id ),
        social_comments ( * )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      authorId: d.author_id,
      type: d.type as PostType,
      content: d.content,
      sessionData: d.session_data || undefined,
      isPublic: d.is_public,
      kudos: (d.social_kudos as { user_id: string }[] || []).map(k => k.user_id),
      comments: (d.social_comments as { id: string, author_id: string, content: string, created_at: string }[] || []).map(c => ({
        id: c.id,
        authorId: c.author_id,
        content: c.content,
        createdAt: c.created_at,
      })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      createdAt: d.created_at,
    }));
  },

  /**
   * Creates a new social post.
   * @param userId - The UUID of the author.
   * @param post - The post details.
   * @returns A promise resolving to the created SocialPost.
   */
  async createPost(userId: string, post: Omit<SocialPost, 'id' | 'createdAt' | 'kudos' | 'comments'>): Promise<SocialPost> {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        author_id: userId,
        type: post.type,
        content: post.content,
        session_data: post.sessionData || null,
        is_public: post.isPublic,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorId: data.author_id,
      type: data.type as PostType,
      content: data.content,
      sessionData: data.session_data || undefined,
      isPublic: data.is_public,
      kudos: [],
      comments: [],
      createdAt: data.created_at,
    };
  },

  /**
   * Toggles a 'kudo' (like) on a specific post.
   * @param userId - The UUID of the user giving/removing the kudo.
   * @param postId - The UUID of the post.
   * @param isAdding - Whether the kudo is being added or removed.
   */
  async toggleKudos(userId: string, postId: string, isAdding: boolean): Promise<void> {
    if (isAdding) {
      await supabase.from('social_kudos').insert({ post_id: postId, user_id: userId });
    } else {
      await supabase.from('social_kudos').delete().match({ post_id: postId, user_id: userId });
    }
  },

  /**
   * Adds a comment to a specific post.
   * @param userId - The UUID of the user authoring the comment.
   * @param postId - The UUID of the post.
   * @param content - The textual content of the comment.
   * @returns A promise resolving to the created PostComment.
   */
  async addComment(userId: string, postId: string, content: string): Promise<PostComment> {
    const { data, error } = await supabase
      .from('social_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content: content,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorId: data.author_id,
      content: data.content,
      createdAt: data.created_at,
    };
  },

  /**
   * Deletes a social post.
   */
  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase.from('social_posts').delete().eq('id', postId);
    if (error) throw error;
  },
  
  /**
   * Deletes a comment.
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase.from('social_comments').delete().eq('id', commentId);
    if (error) throw error;
  },

  /**
   * Retrieves the list of user IDs that the current user is following.
   * @param userId - The UUID of the current user.
   * @returns A promise resolving to an array of followed UUIDs.
   */
  async fetchFollowing(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('social_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error || !data) return [];
    return data.map(d => d.following_id);
  },

  /**
   * Follows another user.
   * @param followerId - The UUID of the user who is following.
   * @param followingId - The UUID of the user being followed.
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    await supabase.from('social_follows').insert({ follower_id: followerId, following_id: followingId });
  },

  /**
   * Unfollows another user.
   * @param followerId - The UUID of the user who is unfollowing.
   * @param followingId - The UUID of the user to unfollow.
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await supabase.from('social_follows').delete().match({ follower_id: followerId, following_id: followingId });
  },

  /**
   * Fetches trending discussions from the Supabase RPC.
   */
  async fetchTrendingDiscussions(): Promise<{ postId: string, authorName: string, content: string, score: number }[]> {
    const { data, error } = await supabase.rpc('get_trending_discussions');
    if (error || !data) {
      console.error('Failed to fetch trending discussions:', error);
      return [];
    }
    return (data as Array<{post_id: string, author_name: string, content: string, score: number}>).map(d => ({
      postId: d.post_id,
      authorName: d.author_name,
      content: d.content,
      score: d.score
    }));
  }
};
