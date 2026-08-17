import { create } from 'zustand';
import type { SocialPost } from '@/types';
import { socialService } from '@/lib/services/social-service';
import { useProfileStore } from './profile-store';

interface SocialState {
  feed: SocialPost[];
  following: string[];
  hasMore: boolean;
  trendingDiscussions: { postId: string, authorName: string, content: string, score: number }[];
}

interface SocialActions {
  addPost: (post: Omit<SocialPost, 'id' | 'createdAt' | 'kudos' | 'comments'>) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  
  followUser: (followingId: string) => Promise<void>;
  unfollowUser: (followingId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;

  setPosts: (posts: SocialPost[]) => void;
  setFollowing: (userIds: string[]) => void;
  loadTrending: () => Promise<void>;
  loadMore: () => Promise<void>;
}

type SocialStore = SocialState & SocialActions;

export const useSocialStore = create<SocialStore>()((set, get) => ({
  feed: [],
  following: [],
  hasMore: true,
  trendingDiscussions: [],

  addPost: async (post) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    try {
      const newPost = await socialService.createPost(userId, post);
      set(state => ({
        feed: [newPost, ...state.feed]
      }));
    } catch (error) {
      console.error('Failed to add post:', error);
    }
  },

  toggleLike: async (postId) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const post = get().feed.find(p => p.id === postId);
    if (!post) return;
    
    const hasLiked = post.kudos.includes(userId);
    
    // Optimistic update
    set(state => ({
      feed: state.feed.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            kudos: hasLiked 
              ? p.kudos.filter(id => id !== userId)
              : [...p.kudos, userId]
          };
        }
        return p;
      })
    }));

    // Service call (the DB table remains social_kudos)
    try {
      await socialService.toggleKudos(userId, postId, !hasLiked);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Rollback optimistic update
      set(state => ({
        feed: state.feed.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              kudos: hasLiked
                ? [...p.kudos, userId]
                : p.kudos.filter(id => id !== userId)
            };
          }
          return p;
        })
      }));
    }
  },

  addComment: async (postId, content) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    try {
      const comment = await socialService.addComment(userId, postId, content);
      
      set(state => ({
        feed: state.feed.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, comment]
            };
          }
          return p;
        })
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  },

  deletePost: async (postId) => {
    await socialService.deletePost(postId);
    set(state => ({ feed: state.feed.filter(p => p.id !== postId) }));
  },

  deleteComment: async (postId, commentId) => {
    await socialService.deleteComment(commentId);
    set(state => ({
      feed: state.feed.map(p => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.filter(c => c.id !== commentId) };
        }
        return p;
      })
    }));
  },

  followUser: async (followingId) => {
    const followerId = useProfileStore.getState().profile?.id;
    if (!followerId) return;

    if (get().following.includes(followingId)) return;
    
    set(state => ({ following: [...state.following, followingId] }));
    try {
      await socialService.followUser(followerId, followingId);
    } catch (error) {
      console.error('Failed to follow user:', error);
      // Rollback
      set(state => ({ following: state.following.filter(id => id !== followingId) }));
    }
  },

  unfollowUser: async (followingId) => {
    const followerId = useProfileStore.getState().profile?.id;
    if (!followerId) return;

    set(state => ({ following: state.following.filter(id => id !== followingId) }));
    try {
      await socialService.unfollowUser(followerId, followingId);
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      // Rollback
      set(state => ({ following: [...state.following, followingId] }));
    }
  },

  isFollowing: (userId) => {
    return get().following.includes(userId);
  },

  setPosts: (posts) => set({ feed: posts, hasMore: posts.length >= 20 }),
  setFollowing: (userIds) => set({ following: userIds }),
  
  loadTrending: async () => {
    const trends = await socialService.fetchTrendingDiscussions();
    set({ trendingDiscussions: trends });
  },

  loadMore: async () => {
    const currentFeed = get().feed;
    try {
      const morePosts = await socialService.fetchFeed(20, currentFeed.length);
      if (morePosts.length < 20) {
        set({ hasMore: false });
      }
      set(state => ({
        feed: [...state.feed, ...morePosts.filter(p => !state.feed.some(existing => existing.id === p.id))]
      }));
    } catch (error) {
      console.error('Failed to load more posts:', error);
    }
  }
}));
