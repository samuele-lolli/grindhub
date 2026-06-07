import { create } from 'zustand';
import type { SocialPost } from '@/types';
import { socialService } from '@/lib/services/social-service';
import { useProfileStore } from './profile-store';

interface SocialState {
  feed: SocialPost[];
  following: string[];
}

interface SocialActions {
  addPost: (post: Omit<SocialPost, 'id' | 'createdAt' | 'kudos' | 'comments'>) => Promise<void>;
  toggleKudos: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  
  followUser: (followingId: string) => Promise<void>;
  unfollowUser: (followingId: string) => Promise<void>;
  isFollowing: (userId: string) => boolean;

  setPosts: (posts: SocialPost[]) => void;
  setFollowing: (userIds: string[]) => void;
}

type SocialStore = SocialState & SocialActions;

export const useSocialStore = create<SocialStore>()((set, get) => ({
  feed: [],
  following: [],

  addPost: async (post) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const newPost = await socialService.createPost(userId, post);
    set(state => ({
      feed: [newPost, ...state.feed]
    }));
  },

  toggleKudos: async (postId) => {
    const userId = useProfileStore.getState().profile?.id;
    if (!userId) return;

    const post = get().feed.find(p => p.id === postId);
    if (!post) return;
    
    const hasKudos = post.kudos.includes(userId);
    
    // Optimistic update
    set(state => ({
      feed: state.feed.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            kudos: hasKudos 
              ? p.kudos.filter(id => id !== userId)
              : [...p.kudos, userId]
          };
        }
        return p;
      })
    }));

    // Service call
    await socialService.toggleKudos(userId, postId, !hasKudos);
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
  setFollowing: (userIds) => set({ following: userIds })
}));
