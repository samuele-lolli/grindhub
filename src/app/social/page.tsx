'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MessageCircle, Send, Share2, Users, Trophy, X, Heart, Trash2, Target, Globe, UserCheck, Flame, Lock } from 'lucide-react';
import { useSocialStore } from '@/stores/social-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { formatRelativeTime, formatCurrency, getSessionProfit, formatDate, formatDuration, platformLabels } from '@/lib/utils';
import type { PostType, AggregatedMTTSession, PlayerProfile, PlayerStats, SocialPost, SocialAuthorSummary, PostComment } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { PublicProfileModal } from '@/components/ui/PublicProfileModal';
import { profileService } from '@/lib/services/profile-service';
import styles from './page.module.css';

// ── Constants ──
const MAX_POST_LENGTH = 500;

const POST_TYPE_BADGES: Record<string, { emoji: string; label: string }> = {
  session_result: { emoji: '🏆', label: 'Session Result' },
  milestone: { emoji: '🚀', label: 'Milestone' },
  goal_completed: { emoji: '🎯', label: 'Goal Completed' },
  text: { emoji: '💬', label: 'Discussion' },
};

function PostTypeBadge({ type }: { type: PostType }) {
  const badge = POST_TYPE_BADGES[type];
  if (!badge || type === 'text') return null;
  return (
    <span className={styles.typeBadge}>
      <span className={styles.typeBadgeEmoji}>{badge.emoji}</span>
      {badge.label}
    </span>
  );
}

/**
 * SocialPage — Community feed, discussions, leaderboard, and profile discovery.
 * Prevents identity spoofing by reading joined author metadata, validates submission locks,
 * and uses real database community leaderboard stats.
 */
export default function SocialPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const posts = useSocialStore(s => s.feed);
  const following = useSocialStore(s => s.following);
  const leaderboard = useSocialStore(s => s.leaderboard);
  const loadLeaderboard = useSocialStore(s => s.loadLeaderboard);
  const addPost = useSocialStore(s => s.addPost);
  const toggleLike = useSocialStore(s => s.toggleLike);
  const addComment = useSocialStore(s => s.addComment);
  const deletePost = useSocialStore(s => s.deletePost);
  const deleteComment = useSocialStore(s => s.deleteComment);
  const hasMore = useSocialStore(s => s.hasMore);
  const loadMore = useSocialStore(s => s.loadMore);
  const follow = useSocialStore(s => s.followUser);

  const players = useProfileStore(s => s.players);
  const profile = useProfileStore(s => s.profile);
  const settings = useSettingsStore(s => s.settings);
  const currency = settings?.currency || 'EUR';
  const mySessions = useSessionStore(s => s.sessions);

  const [feedMode, setFeedMode] = useState<'community' | 'following'>('community');
  const [newPost, setNewPost] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null);

  // Attached session state
  const [attachedSession, setAttachedSession] = useState<AggregatedMTTSession | null>(null);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Public Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<{ profile: PlayerProfile; stats: Partial<PlayerStats> | null } | null>(null);

  // Load verified community leaderboard on mount
  useEffect(() => {
    loadLeaderboard().catch(err => console.error('Failed to load leaderboard:', err));
  }, [loadLeaderboard]);

  // Robust Author Resolution (Fixes D4.1 — Never fall back to active profile for other users)
  const getPostAuthor = useCallback((post: SocialPost): SocialAuthorSummary => {
    if (post.author) return post.author;
    if (post.authorId === profile?.id) {
      return {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.avatar,
      };
    }
    const match = players.find(p => p.id === post.authorId);
    if (match) {
      return {
        id: match.id,
        username: match.username,
        displayName: match.displayName,
        avatar: match.avatar,
      };
    }
    return {
      id: post.authorId,
      username: 'grinder',
      displayName: 'Grinder',
      avatar: '',
    };
  }, [profile, players]);

  const getCommentAuthor = useCallback((comment: PostComment): SocialAuthorSummary => {
    if (comment.author) return comment.author;
    if (comment.authorId === profile?.id) {
      return {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatar: profile.avatar,
      };
    }
    const match = players.find(p => p.id === comment.authorId);
    if (match) {
      return {
        id: match.id,
        username: match.username,
        displayName: match.displayName,
        avatar: match.avatar,
      };
    }
    return {
      id: comment.authorId,
      username: 'grinder',
      displayName: 'Grinder',
      avatar: '',
    };
  }, [profile, players]);

  // Feed filtering
  const feedPosts = useMemo(() => {
    const list = feedMode === 'community'
      ? posts
      : posts.filter(p => following.includes(p.authorId) || p.authorId === profile?.id);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, following, profile?.id, feedMode]);

  const handleSharePost = useCallback(async (post: SocialPost) => {
    const author = getPostAuthor(post);
    let summary = `${author.displayName} (@${author.username}) on GrindHub:\n`;
    if (post.content) summary += `"${post.content}"\n`;
    if (post.sessionData) {
      const profit = getSessionProfit(post.sessionData as AggregatedMTTSession);
      summary += `Session: ${formatCurrency(profit, currency, true)} (${post.sessionData.eventCount || 0} MTTs · ${post.sessionData.cashesCount || 0} ITM)`;
    }
    try {
      await navigator.clipboard.writeText(summary.trim());
      toast.success(t.social.copiedPostToast || 'Post summary copied to clipboard!');
    } catch {
      toast.error(t.social.copyErrorToast || 'Could not copy to clipboard.');
    }
  }, [getPostAuthor, currency, toast, t.social]);

  // Suggested players
  const suggestedPlayers = useMemo(() => {
    return players
      .filter(p => !following.includes(p.id) && p.id !== profile?.id && !p.isCurrentUser)
      .slice(0, 5);
  }, [players, following, profile?.id]);

  // Modal Escape key listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSessionPicker(false);
    };
    if (showSessionPicker) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showSessionPicker]);

  // Handle open session picker with demo mode safety
  const handleOpenSessionPicker = () => {
    if (profile?.demoStatus === 'active') {
      toast.info(t.social.demoShareBlocked || 'Session sharing is disabled while in Demo Mode. Clear demo data in Dashboard to share real sessions with the community.');
      return;
    }
    setShowSessionPicker(true);
  };

  const handlePostSubmit = useCallback(async () => {
    if (isSubmittingPost) return;
    if (!newPost.trim() && !attachedSession) return;
    if (newPost.length > MAX_POST_LENGTH) return;

    if (attachedSession && profile?.demoStatus === 'active') {
      toast.info(t.social.demoShareBlocked || 'Cannot share demo sessions to the public feed.');
      return;
    }

    setIsSubmittingPost(true);
    try {
      const postType: PostType = attachedSession ? 'session_result' : 'text';

      await addPost({
        authorId: profile?.id || '',
        type: postType,
        content: newPost.trim(),
        sessionData: attachedSession || undefined,
        isPublic: true,
      });

      setNewPost('');
      setAttachedSession(null);
      setComposerFocused(false);
      toast.success('Post published!');
    } catch (err) {
      console.error('Failed to submit post:', err);
      toast.error(t.social.postErrorToast || 'Failed to publish post. Please try again.');
    } finally {
      setIsSubmittingPost(false);
    }
  }, [isSubmittingPost, newPost, attachedSession, profile, addPost, toast, t.social]);

  // View Public Profile
  const handleViewProfile = useCallback(async (userId: string) => {
    try {
      const data = await profileService.fetchPublicProfile(userId);
      if (data && data.profile) {
        setSelectedProfile(data);
      }
    } catch (err) {
      console.error('Error fetching public profile:', err);
    }
  }, []);

  // Comment
  const handleComment = useCallback(async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || submittingCommentPostId === postId) return;

    setSubmittingCommentPostId(postId);
    try {
      await addComment(postId, text);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error(t.social.commentErrorToast || 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingCommentPostId(null);
    }
  }, [commentInputs, submittingCommentPostId, addComment, toast, t.social]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const charCount = newPost.length;
  const charOverLimit = charCount > MAX_POST_LENGTH;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {t.social.title}
          <UITooltip content={t.tooltips?.socialFeed || 'Posts are visible to the community. Your private ledger balance is never shared.'} position="right" />
        </h1>
      </div>

      <div className={styles.layout}>
        {/* ── Main Column ── */}
        <main className={styles.mainColumn}>
          {/* ── Post Composer ── */}
          <div className={`${styles.composer} ${composerFocused || attachedSession ? styles.composerFocused : ''}`}>
            <div className={styles.composerTop}>
              <Avatar
                name={profile?.displayName || 'You'}
                src={profile?.avatar}
                size="md"
              />
              <div className={styles.composerInputWrap}>
                <textarea
                  className={styles.composerTextarea}
                  placeholder={t.social.whatsOnYourMind}
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => { if (!newPost.trim() && !attachedSession) setComposerFocused(false); }}
                  rows={composerFocused || attachedSession ? 3 : 1}
                />

                {/* Attached Session Preview inside Composer */}
                {attachedSession && (
                  <div className={styles.sessionEmbed} style={{ marginTop: '12px' }}>
                    <div className={styles.sessionEmbedHeader}>
                      <span className={styles.sessionEmbedTitle}>
                        <Trophy size={16} className="text-gold" />
                        {t.social.aggregatedSession}
                      </span>
                      <button className={styles.modalClose} onClick={() => setAttachedSession(null)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.sessionEmbedMetrics}>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>{t.sessions.profit}</span>
                        <span className={`${styles.embedMetricValue} ${getSessionProfit(attachedSession) >= 0 ? styles.profitPos : styles.profitNeg}`}>
                          {formatCurrency(getSessionProfit(attachedSession), currency, true)}
                        </span>
                      </div>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>{t.social.eventsPlayed}</span>
                        <span className={styles.embedMetricValue}>{attachedSession.eventCount}</span>
                      </div>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>{t.social.itmCashes}</span>
                        <span className={styles.embedMetricValue}>{attachedSession.cashesCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.composerBottom}>
              <div className={styles.composerTools}>
                <button
                  type="button"
                  className={`${styles.composerToolBtn} ${attachedSession ? styles.composerToolBtnActive : ''}`}
                  onClick={handleOpenSessionPicker}
                >
                  <Share2 size={14} />
                  {t.social.shareSession}
                </button>
              </div>

              <div className={styles.composerRight}>
                <span className={`${styles.charCount} ${charOverLimit ? styles.charCountOver : ''}`}>
                  {charCount}/{MAX_POST_LENGTH}
                </span>
                <button
                  className={styles.postBtn}
                  onClick={handlePostSubmit}
                  disabled={(!newPost.trim() && !attachedSession) || charOverLimit || isSubmittingPost}
                >
                  <Send size={14} />
                  {isSubmittingPost ? 'Posting...' : t.social.post}
                </button>
              </div>
            </div>
          </div>

          {/* ── Feed Mode Tabs (Community vs Following) ── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setFeedMode('community')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: feedMode === 'community' ? 'var(--accent-blue-bg)' : 'var(--bg-glass)',
                color: feedMode === 'community' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                border: `1px solid ${feedMode === 'community' ? 'var(--accent-blue)' : 'var(--border-primary)'}`
              }}
            >
              <Globe size={14} /> {t.social.communityFeedTab} ({posts.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('following')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: feedMode === 'following' ? 'var(--accent-purple-bg)' : 'var(--bg-glass)',
                color: feedMode === 'following' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                border: `1px solid ${feedMode === 'following' ? 'var(--accent-purple)' : 'var(--border-primary)'}`
              }}
            >
              <UserCheck size={14} /> {t.social.followingTab} ({following.length})
            </button>
          </div>

          {/* ── Feed ── */}
          <div className={styles.feed}>
            {feedPosts.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>♠</div>
                <p className={styles.emptyTitle}>{t.social.noPostsYet}</p>
                <p className={styles.emptySubtitle}>{t.social.followPlayers}</p>
              </div>
            ) : (
              feedPosts.map((post, i) => {
                const author = getPostAuthor(post);
                const isLiked = post.kudos.includes(profile?.id || '');
                const isCommentsOpen = expandedComments[post.id] ?? false;
                const isAuthor = post.authorId === profile?.id;

                return (
                  <article key={post.id} id={`post-${post.id}`} className={styles.postCard} style={{ animationDelay: `${i * 50}ms` }}>
                    {/* Header */}
                    <div className={styles.postHeader}>
                      <div className={styles.authorAvatarWrap} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(post.authorId)}>
                        <Avatar name={author.displayName} src={author.avatar} size="md" />
                      </div>
                      <div className={styles.postMeta}>
                        <div className={styles.postMetaTop}>
                          <span className={styles.authorName} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(post.authorId)}>
                            {author.displayName}
                          </span>
                          <span className={styles.authorUsername}>@{author.username}</span>
                          <PostTypeBadge type={post.type} />
                        </div>
                        <span className={styles.postTime}>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                      {isAuthor && (
                        <button className={styles.actionBtn} onClick={() => deletePost(post.id)} title="Delete post" style={{ marginLeft: 'auto' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    {post.content && (
                      <p className={styles.postContent}>{post.content}</p>
                    )}

                    {/* Rich Session Embed */}
                    {post.sessionData && post.type === 'session_result' && (
                      <div className={`${styles.sessionEmbed} ${getSessionProfit(post.sessionData as AggregatedMTTSession) < 0 ? styles.negativeProfit : ''}`}>
                        <div className={styles.sessionEmbedHeader}>
                          <span className={styles.sessionEmbedTitle}>
                            <Trophy size={16} className="text-gold" />
                            {t.social.sessionResultsTitle}
                          </span>
                          <span className={styles.sessionPickerMeta}>
                            {formatDate(post.sessionData.date || new Date().toISOString())}
                            {post.sessionData.duration ? ` · ${formatDuration(post.sessionData.duration)}` : ''}
                          </span>
                        </div>
                        <div className={styles.sessionEmbedMetrics}>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>{t.sessions.profit}</span>
                            <span className={`${styles.embedMetricValue} ${getSessionProfit(post.sessionData as AggregatedMTTSession) >= 0 ? styles.profitPos : styles.profitNeg}`}>
                              {formatCurrency(getSessionProfit(post.sessionData as AggregatedMTTSession), currency, true)}
                            </span>
                          </div>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>{t.social.eventsPlayed}</span>
                            <span className={styles.embedMetricValue}>{post.sessionData.eventCount || 0}</span>
                          </div>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>{t.social.itmCashes}</span>
                            <span className={styles.embedMetricValue}>{post.sessionData.cashesCount || 0}</span>
                          </div>
                        </div>
                        {post.sessionData.platforms && post.sessionData.platforms.length > 0 && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {post.sessionData.platforms.map((p, idx) => (
                              <span key={idx} className={styles.typeBadge} style={{ fontSize: '10px' }}>
                                {platformLabels[p as keyof typeof platformLabels] || p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Goal Completed Embed */}
                    {post.type === 'goal_completed' && post.data && (
                      <div className={styles.sessionEmbed} style={{ background: 'linear-gradient(to right, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05))', borderColor: 'rgba(234, 179, 8, 0.2)' }}>
                        <div className={styles.sessionEmbedHeader}>
                          <span className={styles.sessionEmbedTitle}>
                            <Target size={16} className="text-gold" />
                            {POST_TYPE_BADGES.goal_completed.label}
                          </span>
                        </div>
                        <div className={styles.sessionEmbedMetrics}>
                          <div className={styles.embedMetric} style={{ width: '100%' }}>
                            <span className={styles.embedMetricValue} style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{String(post.data.goalTitle || '')}</span>
                            <span className={styles.embedMetricLabel} style={{ marginTop: '4px' }}>Target: {String(post.data.target || '')}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className={styles.actionBar}>
                      <button
                        className={`${styles.actionBtn} ${isLiked ? styles.actionBtnKudosActive : ''}`}
                        onClick={() => toggleLike(post.id)}
                      >
                        <Heart size={16} className={styles.actionIcon} fill={isLiked ? "currentColor" : "none"} />
                        <span className={styles.actionLabel}>
                          {post.kudos.length > 0 ? post.kudos.length : ''} {post.kudos.length === 1 ? t.social.likeSingular : t.social.likePlural}
                        </span>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${isCommentsOpen ? styles.actionBtnActive : ''}`}
                        onClick={() => toggleComments(post.id)}
                      >
                        <MessageCircle size={16} className={styles.actionIcon} />
                        <span className={styles.actionLabel}>
                          {post.comments.length > 0 ? post.comments.length : ''} {t.social.comment}
                        </span>
                      </button>
                      <button
                        className={styles.actionBtn}
                        style={{ marginLeft: 'auto' }}
                        onClick={() => handleSharePost(post)}
                        title="Copy post summary"
                      >
                        <Share2 size={16} className={styles.actionIcon} />
                      </button>
                    </div>

                    {/* Comments */}
                    {isCommentsOpen && (
                      <div className={styles.commentsSection}>
                        {post.comments.length > 0 && (
                          <div className={styles.commentsList}>
                            {post.comments.map(c => {
                              const cAuthor = getCommentAuthor(c);
                              const isCommentAuthor = c.authorId === profile?.id;
                              return (
                                <div key={c.id} className={styles.commentItem}>
                                  <Avatar name={cAuthor.displayName} src={cAuthor.avatar} size="sm" />
                                  <div className={styles.commentBubble}>
                                    <span className={styles.commentAuthorName}>{cAuthor.displayName}</span>
                                    <span className={styles.commentText}>{c.content}</span>
                                    <span className={styles.commentTime}>{formatRelativeTime(c.createdAt)}</span>
                                  </div>
                                  {(isCommentAuthor || isAuthor) && (
                                    <button
                                      className={styles.deleteCommentBtn}
                                      onClick={() => deleteComment(post.id, c.id)}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', marginLeft: 'auto' }}
                                      title="Delete comment"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className={styles.commentInputRow}>
                          <Avatar name={profile?.displayName || 'You'} src={profile?.avatar} size="sm" />
                          <div className={styles.commentInputWrap}>
                            <input
                              type="text"
                              className={styles.commentInput}
                              placeholder={t.social.writeComment}
                              maxLength={500}
                              value={commentInputs[post.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleComment(post.id);
                              }}
                            />
                            <button
                              className={styles.commentSendBtn}
                              onClick={() => handleComment(post.id)}
                              disabled={!(commentInputs[post.id]?.trim()) || submittingCommentPostId === post.id}
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
            {hasMore && feedPosts.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
                <button className={styles.actionBtn} style={{ padding: '8px 24px', fontSize: '13px' }} onClick={() => loadMore()}>
                  {t.social.loadMore}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <Flame size={16} style={{ color: 'var(--accent-gold)' }} />
              {t.social.grindersLeaderboard}
            </h3>
            <div className={styles.trendingList}>
              {leaderboard.length === 0 ? (
                <div className={styles.sidebarEmpty}>No active rankings yet</div>
              ) : (
                leaderboard.slice(0, 5).map((entry, i) => (
                  <div
                    key={entry.id}
                    className={styles.trendingItem}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer' }}
                    onClick={() => handleViewProfile(entry.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{
                        width: '20px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 800,
                        color: i === 0 ? 'var(--accent-gold)' : i === 1 ? 'var(--accent-blue)' : 'var(--text-muted)'
                      }}>
                        #{i + 1}
                      </span>
                      <Avatar name={entry.name} src={entry.avatar} size="sm" />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.name} {entry.id === profile?.id && <small style={{ color: 'var(--accent-blue)' }}>{t.social.youBadge}</small>}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {entry.mttsLogged} {t.social.mttsLabel} · {entry.sessionsLogged} {t.social.sessionsLabel}
                        </span>
                      </div>
                    </div>
                    {entry.netProfit !== null ? (
                      <span style={{
                        fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: entry.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {formatCurrency(entry.netProfit, currency, true)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Lock size={10} /> {t.social.privateProfit}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <Users size={16} className="text-purple" />
              {t.social.suggestedPlayers}
            </h3>
            {suggestedPlayers.length === 0 ? (
              <div className={styles.sidebarEmpty}>{t.social.noNewPlayers}</div>
            ) : (
              <div className={styles.suggestedList}>
                {suggestedPlayers.map(p => (
                  <div key={p.id} className={styles.suggestedItem}>
                    <div style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(p.id)}>
                      <Avatar name={p.displayName} src={p.avatar} size="md" />
                    </div>
                    <div className={styles.suggestedInfo}>
                      <span className={styles.suggestedName} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(p.id)}>{p.displayName}</span>
                      <span className={styles.suggestedUsername} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(p.id)}>@{p.username}</span>
                    </div>
                    <button className={styles.followBtn} onClick={() => follow(p.id)}>
                      {t.profile.follow}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── Session Picker Modal ── */}
      {showSessionPicker && (
        <div className={styles.modalOverlay} onClick={() => setShowSessionPicker(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{t.social.selectSessionModal}</h2>
              <button className={styles.modalClose} onClick={() => setShowSessionPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.sessionListPicker}>
              {mySessions.length === 0 ? (
                <p className={styles.sidebarEmpty}>{t.social.noSessionsToShare}</p>
              ) : (
                [...mySessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(s => {
                  const prof = getSessionProfit(s);
                  return (
                    <div key={s.id} className={styles.sessionPickerItem} onClick={() => { setAttachedSession(s); setShowSessionPicker(false); }}>
                      <div className={styles.sessionPickerLeft}>
                        <span className={styles.sessionPickerDate}>{formatDate(s.date)}</span>
                        <span className={styles.sessionPickerMeta}>{s.eventCount} MTTs · {s.platforms.map(p => platformLabels[p as keyof typeof platformLabels] || p).join(', ')}</span>
                      </div>
                      <span className={`${styles.sessionPickerRight} ${prof >= 0 ? styles.profitPos : styles.profitNeg}`}>
                        {formatCurrency(prof, currency, true)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProfile && (
        <PublicProfileModal
          selectedProfile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
