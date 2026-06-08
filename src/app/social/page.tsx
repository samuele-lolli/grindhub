'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { MessageCircle, Send, Share2, Users, TrendingUp, Trophy, X, Heart } from 'lucide-react';
import { useSocialStore } from '@/stores/social-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSessionStore } from '@/stores/session-store';
import { Tooltip as UITooltip } from '@/components/ui/Tooltip';
import { useI18n } from '@/i18n';
import { formatRelativeTime, getInitials, formatCurrency, getSessionProfit, formatDate, formatDuration, platformLabels, getAvatarColor } from '@/lib/utils';
import type { PostType, AggregatedMTTSession, PlayerProfile, PlayerStats } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { PublicProfileModal } from '@/components/ui/PublicProfileModal';
import { profileService } from '@/lib/services/profile-service';
import styles from './page.module.css';

// ── Constants ──
const MAX_POST_LENGTH = 500;
const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ── Helpers ──


const POST_TYPE_BADGES: Record<string, { emoji: string; label: string }> = {
  session_result: { emoji: '🏆', label: 'Session Result' },
  milestone: { emoji: '🚀', label: 'Milestone' },
  goal_completed: { emoji: '🎯', label: 'Goal Completed' },
  text: { emoji: '💬', label: 'Discussion' },
};

// ── Trending topics ──
const TRENDING_TOPICS = [
  { tag: '#FinalTable', posts: 42 },
  { tag: '#MTTGrind', posts: 38 },
  { tag: '#BankrollChallenge', posts: 27 },
  { tag: '#DeepRun', posts: 19 },
  { tag: '#PokerStrategy', posts: 15 },
];

// ── Sub-Components ──

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

// ── Main Page Component ──

/**
 * SocialPage — Social feed and discovery interface.
 * Renders a post composer, feed/discover tabs, session sharing, kudos, comments,
 * trending topics sidebar, and suggested players to follow.
 */
export default function SocialPage() {
  const { t } = useI18n();
  const posts = useSocialStore(s => s.feed);
  const following = useSocialStore(s => s.following);
  const addPost = useSocialStore(s => s.addPost);
  const toggleKudos = useSocialStore(s => s.toggleKudos);
  const addComment = useSocialStore(s => s.addComment);
  const follow = useSocialStore(s => s.followUser);
  
  const players = useProfileStore(s => s.players);
  const profile = useProfileStore(s => s.profile);
  const mySessions = useSessionStore(s => s.sessions);


  const [newPost, setNewPost] = useState('');
  const [composerFocused, setComposerFocused] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  
  // Attach session state
  const [attachedSession, setAttachedSession] = useState<AggregatedMTTSession | null>(null);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // ── Public Profile Modal State ──
  const [selectedProfile, setSelectedProfile] = useState<{ profile: PlayerProfile, stats: Partial<PlayerStats> | null } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // ── Player lookup ──
  const getPlayer = useCallback(
    (id: string) => {
      if (id === 'current-user' || id === profile?.id) return profile;
      return players.find(p => p.id === id) || profile;
    },
    [players, profile]
  );

  // ── Feed filtering ──
  const feedPosts = useMemo(() => {
    const list = posts.filter(p => following.includes(p.authorId) || p.authorId === 'current-user' || p.authorId === profile?.id);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, following, profile?.id]);

  // ── Suggested players ──
  const suggestedPlayers = useMemo(() => {
    return players
      .filter(p => !following.includes(p.id) && p.id !== 'current-user' && !p.isCurrentUser)
      .slice(0, 5);
  }, [players, following]);

  // ── Create post ──
  const handlePost = useCallback(() => {
    if (!newPost.trim() && !attachedSession) return;
    if (newPost.length > MAX_POST_LENGTH) return;
    
    const postType: PostType = attachedSession ? 'session_result' : 'text';

    addPost({
      authorId: profile?.id || 'current-user',
      type: postType,
      content: newPost.trim(),
      sessionData: attachedSession || undefined,
      isPublic: true,
    });
    setNewPost('');
    setAttachedSession(null);
    setComposerFocused(false);
  }, [newPost, attachedSession, addPost, profile?.id]);

  // ── View Public Profile ──
  const handleViewProfile = useCallback(async (userId: string) => {
    setIsProfileLoading(true);
    try {
      const data = await profileService.fetchPublicProfile(userId);
      if (data && data.profile) {
        setSelectedProfile(data);
      }
    } catch (err) {
      console.error('Error fetching public profile:', err);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  // ── Comment ──
  const handleComment = useCallback(
    (postId: string) => {
      const text = commentInputs[postId];
      if (!text?.trim()) return;
      addComment(postId, text.trim());
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    },
    [commentInputs, addComment]
  );

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const charCount = newPost.length;
  const charOverLimit = charCount > MAX_POST_LENGTH;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center' }}>
          {t.social.title}
          <UITooltip content={t.tooltips?.socialFeed || 'Posts are visible to anyone who follows you. Your exact bankroll is ALWAYS private.'} position="right" />
        </h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${styles.tabActive}`}
          >
            <Users size={15} />
            {t.social.feed}
          </button>
        </div>
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
                        Aggregated Session
                      </span>
                      <button className={styles.modalClose} onClick={() => setAttachedSession(null)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.sessionEmbedMetrics}>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>Profit</span>
                        <span className={`${styles.embedMetricValue} ${getSessionProfit(attachedSession) >= 0 ? styles.profitPos : styles.profitNeg}`}>
                          {formatCurrency(getSessionProfit(attachedSession), 'EUR', true)}
                        </span>
                      </div>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>Events</span>
                        <span className={styles.embedMetricValue}>{attachedSession.eventCount}</span>
                      </div>
                      <div className={styles.embedMetric}>
                        <span className={styles.embedMetricLabel}>ITM</span>
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
                  className={`${styles.composerToolBtn} ${attachedSession ? styles.composerToolBtnActive : ''}`}
                  onClick={() => setShowSessionPicker(true)}
                >
                  <Share2 size={14} />
                  Share Session
                </button>
              </div>
              
              <div className={styles.composerRight}>
                <span className={`${styles.charCount} ${charOverLimit ? styles.charCountOver : ''}`}>
                  {charCount}/{MAX_POST_LENGTH}
                </span>
                <button
                  className={styles.postBtn}
                  onClick={handlePost}
                  disabled={(!newPost.trim() && !attachedSession) || charOverLimit}
                >
                  <Send size={14} />
                  {t.social.post}
                </button>
              </div>
            </div>
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
                const author = getPlayer(post.authorId);
                const isKudosed = post.kudos.includes('current-user');
                const isCommentsOpen = expandedComments[post.id] ?? false;
                const avatarBg = typeof author?.avatar === 'string' && author.avatar.startsWith('#') ? author.avatar : getAvatarColor(post.authorId);

                return (
                  <article key={post.id} className={styles.postCard} style={{ animationDelay: `${i * 50}ms` }}>
                    {/* Header */}
                    <div className={styles.postHeader}>
                      <div className={styles.authorAvatarWrap} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(post.authorId)}>
                        <Avatar name={author?.displayName || 'Unknown'} src={author?.avatar} size="md" />
                      </div>
                      <div className={styles.postMeta}>
                        <div className={styles.postMetaTop}>
                          <span className={styles.authorName} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(post.authorId)}>
                            {author?.displayName || 'Unknown'}
                          </span>
                          <span className={styles.authorUsername}>@{author?.username || 'user'}</span>
                          <PostTypeBadge type={post.type} />
                        </div>
                        <span className={styles.postTime}>{formatRelativeTime(post.createdAt)}</span>
                      </div>
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
                            Session Results
                          </span>
                          <span className={styles.sessionPickerMeta}>
                            {formatDate(post.sessionData.date || new Date().toISOString())}
                            {post.sessionData.duration ? ` · ${formatDuration(post.sessionData.duration)}` : ''}
                          </span>
                        </div>
                        <div className={styles.sessionEmbedMetrics}>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>Profit</span>
                            <span className={`${styles.embedMetricValue} ${getSessionProfit(post.sessionData as AggregatedMTTSession) >= 0 ? styles.profitPos : styles.profitNeg}`}>
                              {formatCurrency(getSessionProfit(post.sessionData as AggregatedMTTSession), 'EUR', true)}
                            </span>
                          </div>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>Events Played</span>
                            <span className={styles.embedMetricValue}>{post.sessionData.eventCount || 0}</span>
                          </div>
                          <div className={styles.embedMetric}>
                            <span className={styles.embedMetricLabel}>ITM (Cashes)</span>
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

                    {/* Action Bar */}
                    <div className={styles.actionBar}>
                      <button
                        className={`${styles.actionBtn} ${isKudosed ? styles.actionBtnKudosActive : ''}`}
                        onClick={() => toggleKudos(post.id)}
                      >
                        <Heart size={16} className={styles.actionIcon} fill={isKudosed ? "currentColor" : "none"} />
                        <span className={styles.actionLabel}>
                          {post.kudos.length > 0 ? post.kudos.length : ''} Kudos
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
                      <button className={styles.actionBtn} style={{ marginLeft: 'auto' }}>
                        <Share2 size={16} className={styles.actionIcon} />
                      </button>
                    </div>

                    {/* Comments */}
                    {isCommentsOpen && (
                      <div className={styles.commentsSection}>
                        {post.comments.length > 0 && (
                          <div className={styles.commentsList}>
                            {post.comments.map(c => {
                              const cAuthor = getPlayer(c.authorId);
                              return (
                                <div key={c.id} className={styles.commentItem}>
                                  <Avatar name={cAuthor?.displayName || 'Unknown'} src={cAuthor?.avatar} size="sm" />
                                  <div className={styles.commentBubble}>
                                    <span className={styles.commentAuthorName}>{cAuthor?.displayName || 'Unknown'}</span>
                                    <span className={styles.commentText}>{c.content}</span>
                                    <span className={styles.commentTime}>{formatRelativeTime(c.createdAt)}</span>
                                  </div>
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
                              value={commentInputs[post.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleComment(post.id);
                              }}
                            />
                            <button
                              className={styles.commentSendBtn}
                              onClick={() => handleComment(post.id)}
                              disabled={!(commentInputs[post.id]?.trim())}
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
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <TrendingUp size={16} className="text-blue" />
              Trending Topics
            </h3>
            <div className={styles.trendingList}>
              {TRENDING_TOPICS.map((topic, i) => (
                <div key={i} className={styles.trendingItem} style={{ animationDelay: `${i * 30}ms` }}>
                  <span className={styles.trendingTag}>{topic.tag}</span>
                  <span className={styles.trendingCount}>{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <Users size={16} className="text-purple" />
              Suggested Players
            </h3>
            {suggestedPlayers.length === 0 ? (
              <div className={styles.sidebarEmpty}>No new players to follow</div>
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
                      {t.profile?.follow || 'Follow'}
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
              <h2>Select a Session to Share</h2>
              <button className={styles.modalClose} onClick={() => setShowSessionPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.sessionListPicker}>
              {mySessions.length === 0 ? (
                <p className={styles.sidebarEmpty}>You have no sessions recorded yet.</p>
              ) : (
                [...mySessions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,10).map(s => {
                  const prof = getSessionProfit(s);
                  return (
                    <div key={s.id} className={styles.sessionPickerItem} onClick={() => { setAttachedSession(s); setShowSessionPicker(false); }}>
                      <div className={styles.sessionPickerLeft}>
                        <span className={styles.sessionPickerDate}>{formatDate(s.date)}</span>
                        <span className={styles.sessionPickerMeta}>{s.eventCount} events · {s.platforms.map(p => platformLabels[p as keyof typeof platformLabels] || p).join(', ')}</span>
                      </div>
                      <span className={`${styles.sessionPickerRight} ${prof >= 0 ? styles.profitPos : styles.profitNeg}`}>
                        {formatCurrency(prof, 'EUR', true)}
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
