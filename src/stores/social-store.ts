import { create } from 'zustand';
import type { SocialPost } from '@/types';
import { socialService } from '@/lib/services/social-service';
import { useProfileStore } from './profile-store';

interface SocialState {
  feed: SocialPost[];
  following: string[];
  trendingDiscussions: { postId: string, authorName: string, content: string, score: number }[];
}

interface SocialActions {
  addPost: (post: Omit<SocialPost, 'id' | 'createdAt' | 'kudos' | 'comments'>) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  
  followUser: (followingId: string) => Promise<void>;
  unfollowUser: (followingId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;

  setPosts: (posts: SocialPost[]) => void;
  setFollowing: (userIds: string[]) => void;
  loadTrending: () => Promise<void>;
}

type SocialStore = SocialState & SocialActions;

export const useSocialStore = create<SocialStore>()((set, get) => ({
  feed: [],
  following: [],
  trendingDiscussions: [],

  addPost: async (post) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newPost = await socialService.createPost(userId, post);
    set(state => ({
      feed: [newPost, ...state.feed]
    }));
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
    await socialService.toggleKudos(userId, postId, !hasLiked);
  },

  addComment: async (postId, content) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

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
  },

  followUser: async (followingId) => {
    const followerId = useProfileStore.getState().profile?.id;
    if (!followerId) return;

    if (get().following.includes(followingId)) return;
    
    set(state => ({ following: [...state.following, followingId] }));
    await socialService.followUser(followerId, followingId);
  },

  unfollowUser: async (followingId) => {
    const followerId = useProfileStore.getState().profile?.id;
    if (!followerId) return;

    set(state => ({ following: state.following.filter(id => id !== followingId) }));
    await socialService.unfollowUser(followerId, followingId);
  },

  isFollowing: (userId) => {
    return get().following.includes(userId);
  },

  setPosts: (posts) => set({ feed: posts }),
  setFollowing: (userIds) => set({ following: userIds }),
  
  loadTrending: async () => {
    const trends = await socialService.fetchTrendingDiscussions();
    set({ trendingDiscussions: trends });
  }
}));
